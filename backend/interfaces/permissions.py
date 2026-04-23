import logging
from typing import Dict, List, Optional, Set

from rest_framework import status as http_status
from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


logger = logging.getLogger("medidesk.rbac")

ADMIN_ROLES = {"super_admin", "admin"}


def _log_denial(request: Request, reason: str, **extra) -> None:
    user = request.user
    logger.warning(
        "RBAC denied: %s",
        reason,
        extra={
            "user_id": str(user.id) if user and user.is_authenticated else "anonymous",
            "role": getattr(user, "role", None),
            "method": request.method,
            "path": request.path,
            **extra,
        },
    )


# ── Module-level CRUD permission matrix ───────────────────────────────────────
#
# Maps  role → module → allowed actions  {"view", "create", "update", "delete"}
#
# Admin/super_admin always bypass every check — they are NOT listed here.
# Roles or modules not present in the matrix are implicitly denied.
#
# HTTP method → action derivation (used by ModulePermission):
#   GET / HEAD / OPTIONS  →  "view"
#   POST                  →  "create"   (override with action="update" for
#                                         action-style endpoints like /complete/)
#   PUT / PATCH           →  "update"
#   DELETE                →  "delete"

ROLE_PERMISSIONS: Dict[str, Dict[str, Set[str]]] = {
    "doctor": {
        "appointments":  {"view", "create", "update"},
        "consultations": {"view", "create", "update"},
        "prescriptions": {"view", "create", "update"},
        "medicines":     {"view", "create", "update"},
        "test_orders":   {"view", "create", "update", "delete"},
        "patients":      {"view", "create", "update"},
        "billing":       {"view"},
        "reports":       {"view", "create"},
        "chambers":      {"view"},
    },
    "assistant_doctor": {
        "appointments":  {"view", "create", "update"},
        "consultations": {"view", "create", "update"},
        "prescriptions": {"view", "create", "update"},
        "medicines":     {"view", "create", "update"},
        "test_orders":   {"view", "create", "update", "delete"},
        "patients":      {"view", "update"},           # cannot register new patients
        "billing":       {"view"},
        "reports":       {"view", "create"},
        "chambers":      {"view"},
    },
    "receptionist": {
        "appointments":  {"view", "create", "update"},
        "consultations": {"view"},
        "prescriptions": set(),
        "medicines":     {"view"},
        "test_orders":   set(),
        "patients":      {"view", "create", "update"},
        "billing":       {"view", "create", "update"},
        "reports":       set(),
        "chambers":      {"view"},
    },
    # Assistant has fewer billing rights than receptionist:
    #   - no billing.update  (cannot change invoice status / items after creation)
    #   - no appointment status change  (RolePermission in appointments views excludes assistant)
    "assistant": {
        "appointments":  {"view", "create", "update"},
        "consultations": {"view"},
        "prescriptions": set(),
        "medicines":     {"view"},
        "test_orders":   set(),
        "patients":      {"view", "create", "update"},
        "billing":       {"view", "create"},
        "reports":       set(),
        "chambers":      {"view"},
    },
    # Trainee: read-only clinical observer — can see all clinical data but cannot
    # create, update, or delete anything, and has no billing access.
    "trainee": {
        "appointments":  {"view"},
        "consultations": {"view"},
        "prescriptions": {"view"},
        "medicines":     {"view"},
        "test_orders":   {"view"},
        "patients":      {"view"},
        "billing":       set(),
        "reports":       set(),
        "chambers":      {"view"},
    },
}

_METHOD_TO_ACTION: Dict[str, str] = {
    "GET":     "view",
    "HEAD":    "view",
    "OPTIONS": "view",
    "POST":    "create",
    "PUT":     "update",
    "PATCH":   "update",
    "DELETE":  "delete",
}


class AdminOnly(BasePermission):
    """Grants access only to users with 'admin' or 'super_admin' role."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        allowed = bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "role")
            and request.user.role in ADMIN_ROLES
        )
        if not allowed:
            _log_denial(request, "AdminOnly: role is not admin/super_admin")
        return allowed


def RolePermission(allowed_roles: List[str]) -> type:
    """
    Factory that returns a permission *class* (not an instance) so it can be
    used directly inside `permission_classes` lists, which DRF (and
    drf-spectacular) expect to contain un-instantiated classes.

    Admin and Super Admin users always pass — they have unrestricted access.

    Usage:
        permission_classes = [IsAuthenticated, RolePermission(["doctor", "receptionist"])]
    """
    class _RolePermission(BasePermission):
        _allowed_roles = allowed_roles

        def has_permission(self, request: Request, view: APIView) -> bool:
            if not (request.user and request.user.is_authenticated and hasattr(request.user, "role")):
                _log_denial(request, "RolePermission: unauthenticated or no role")
                return False
            if request.user.role in ADMIN_ROLES:
                return True
            if request.user.role not in self._allowed_roles:
                _log_denial(
                    request,
                    "RolePermission: role not in allowed list",
                    allowed_roles=self._allowed_roles,
                )
                return False
            return True

    _RolePermission.__name__ = f"RolePermission{allowed_roles}"
    _RolePermission.__qualname__ = f"RolePermission{allowed_roles}"
    return _RolePermission


def ModulePermission(module: str, action: Optional[str] = None) -> type:
    """
    Permission class factory that enforces ROLE_PERMISSIONS for a given module.

    The required action is derived from the HTTP method unless ``action`` is
    explicitly supplied (useful for action-style POST endpoints such as
    ``/complete/``, ``/approve/``, or ``/check-in/`` which are semantically
    *updates* despite being POST requests):

        GET / HEAD / OPTIONS  →  "view"
        POST                  →  "create"
        PUT / PATCH           →  "update"
        DELETE                →  "delete"

    Admin and super_admin users always bypass the check.
    Roles not present in ROLE_PERMISSIONS are implicitly denied.

    Usage::

        # Standard — action derived from HTTP method
        permission_classes = [IsAuthenticated, ModulePermission("appointments")]

        # Explicit action override (POST that is semantically an update)
        permission_classes = [IsAuthenticated, ModulePermission("consultations", action="update")]
    """
    class _ModulePermission(BasePermission):
        _module = module
        _action_override = action

        def has_permission(self, request: Request, view: APIView) -> bool:
            if not (request.user and request.user.is_authenticated
                    and hasattr(request.user, "role")):
                _log_denial(request, "ModulePermission: unauthenticated or no role", module=self._module)
                return False
            if request.user.role in ADMIN_ROLES:
                return True
            effective_action = (
                self._action_override
                or _METHOD_TO_ACTION.get(request.method, "view")
            )
            allowed: Set[str] = (
                ROLE_PERMISSIONS
                .get(request.user.role, {})
                .get(self._module, set())
            )
            if effective_action not in allowed:
                _log_denial(
                    request,
                    "ModulePermission: action not allowed for role",
                    module=self._module,
                    action=effective_action,
                )
                return False
            return True

    suffix = f",action={action}" if action else ""
    _ModulePermission.__name__ = f"ModulePermission[{module}{suffix}]"
    _ModulePermission.__qualname__ = _ModulePermission.__name__
    return _ModulePermission


class ConsultationOwnershipMixin:
    """
    Mixin for APIViews that own resources tied to a specific consultation.

    Enforces the rule: **both doctors and assistant_doctors** may only write to
    resources that belong to a consultation *they personally started*
    (i.e. ``consultation.doctor_id == request.user.id``).

    Admins, super_admins, receptionists, and all other roles bypass the check
    entirely — it is not their concern who started the consultation.

    Usage
    -----
    Inherit alongside ``APIView`` and call ``check_consultation_scope`` after
    loading the consultation (or the resource that links back to one):

        class MyView(ConsultationOwnershipMixin, APIView):
            def patch(self, request, ...):
                obj = MyModel.objects.get(...)
                scope_err = self.check_consultation_scope(
                    request, obj.consultation.doctor_id
                )
                if scope_err:
                    return scope_err
                ...

    The method returns a ready-made ``Response({"error": "Access denied"}, 403)``
    on failure, so callers use a simple ``if scope_err: return scope_err`` guard.
    It returns ``None`` when the check passes.
    """

    def check_consultation_scope(
        self, request: Request, consultation_doctor_id
    ) -> Optional[Response]:
        """
        Return HTTP 403 if the clinical user is NOT the doctor who started the
        consultation.  Return ``None`` for all non-clinical roles (they bypass).

        Applies to: ``doctor``, ``assistant_doctor``.
        Bypasses for: ``admin``, ``super_admin``, ``receptionist``, ``assistant``.

        :param request: The DRF request object.
        :param consultation_doctor_id: The ``doctor_id`` field of the relevant
            consultation (UUID or string — both are accepted).
        """
        role = getattr(request.user, "role", None)
        if role not in ("doctor", "assistant_doctor"):
            return None  # admins and reception staff are not subject to this scope
        if str(consultation_doctor_id) == str(request.user.id):
            return None  # own consultation
        if role == "doctor":
            # Also allow if the consultation was run by an assistant_doctor supervised by this doctor
            from infrastructure.orm.models.user_model import UserModel
            if UserModel.objects.filter(
                id=consultation_doctor_id,
                supervisor_id=request.user.id,
            ).exists():
                return None
        _log_denial(
            request,
            "ConsultationOwnership: user is not the consultation's doctor",
            consultation_doctor_id=str(consultation_doctor_id),
        )
        return Response(
            {"error": "Access denied"},
            status=http_status.HTTP_403_FORBIDDEN,
        )


# Keep the old name as an alias so any external code referencing it still works
AssistantDoctorScopeMixin = ConsultationOwnershipMixin


class ReceptionistChamberScopeMixin:
    """
    Mixin for APIViews that manage appointment resources.

    Enforces the rule: **receptionists and assistants** may only create or modify
    appointments that belong to a chamber they are assigned to
    (``user.chambers`` M2M relationship).

    Bypass conditions (returns ``None`` without a 403):
    - Role is not ``receptionist`` or ``assistant`` (doctors, admins, etc. pass).
    - The appointment has no chamber set (``chamber_id`` is ``None``).
    - The user has **no chambers assigned** — treated as "all-access" so
      newly-onboarded staff aren't inadvertently locked out.

    Usage
    -----
        class MyView(ReceptionistChamberScopeMixin, APIView):
            def post(self, request, appointment_id, ...):
                appt = repo.get_by_id(appointment_id)
                scope_err = self.check_chamber_scope(request, appt.chamber_id)
                if scope_err:
                    return scope_err
                ...
    """

    def check_chamber_scope(
        self, request: Request, chamber_id
    ) -> Optional[Response]:
        """
        Return HTTP 403 if the receptionist/assistant is not assigned to the
        appointment's chamber.  Return ``None`` when the check passes.

        :param request: The DRF request object.
        :param chamber_id: The ``chamber_id`` of the appointment being acted on
            (UUID, string, or ``None`` — ``None`` always passes).
        """
        role = getattr(request.user, "role", None)
        if role not in ("receptionist", "assistant"):
            return None  # non-reception roles bypass

        if not chamber_id:
            return None  # appointment has no chamber — cannot scope

        # Fetch the user's assigned chamber IDs in one query
        assigned_ids = set(
            str(c) for c in request.user.chambers.values_list("id", flat=True)
        )

        if not assigned_ids:
            return None  # unscoped receptionist — allow all chambers

        if str(chamber_id) not in assigned_ids:
            _log_denial(
                request,
                "ChamberScope: user not assigned to this chamber",
                chamber_id=str(chamber_id),
                assigned_chambers=list(assigned_ids),
            )
            return Response(
                {"error": "You can only manage appointments in your assigned chambers"},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        return None
