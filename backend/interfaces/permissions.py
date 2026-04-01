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


class RolePermission(BasePermission):
    """
    Grants access to users whose role is in allowed_roles.
    Admin and Super Admin users always pass — they have unrestricted access.
    """

    def __init__(self, allowed_roles: List[str]) -> None:
        self.allowed_roles = allowed_roles

    def has_permission(self, request: Request, view: APIView) -> bool:
        if not (request.user and request.user.is_authenticated and hasattr(request.user, "role")):
            return False
        # Super Admin and Admin bypass all role restrictions
        if request.user.role in ADMIN_ROLES:
            return True
        return request.user.role in self.allowed_roles
