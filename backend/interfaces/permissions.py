from typing import List

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView


ADMIN_ROLES = {"super_admin", "admin"}


class AdminOnly(BasePermission):
    """Grants access only to users with 'admin' or 'super_admin' role."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "role")
            and request.user.role in ADMIN_ROLES
        )


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
                return False
            if request.user.role in ADMIN_ROLES:
                return True
            return request.user.role in self._allowed_roles

    _RolePermission.__name__ = f"RolePermission{allowed_roles}"
    _RolePermission.__qualname__ = f"RolePermission{allowed_roles}"
    return _RolePermission
