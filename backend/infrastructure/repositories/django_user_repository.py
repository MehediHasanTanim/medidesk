from typing import List, Optional, Tuple
from uuid import UUID

from domain.entities.user import User, UserRole
from domain.repositories.i_user_repository import IUserRepository
from infrastructure.orm.models.user_model import UserModel


class DjangoUserRepository(IUserRepository):

    def get_by_id(self, user_id: UUID) -> Optional[User]:
        try:
            return self._to_domain(
                UserModel.objects.prefetch_related("chambers").get(id=user_id)
            )
        except UserModel.DoesNotExist:
            return None

    def get_by_username(self, username: str) -> Optional[User]:
        try:
            return self._to_domain(
                UserModel.objects.prefetch_related("chambers").get(username=username)
            )
        except UserModel.DoesNotExist:
            return None

    # Fields the caller is allowed to sort by (prefix with "-" for DESC)
    _ALLOWED_ORDERINGS = {
        "full_name", "username", "email", "role", "is_active", "date_joined",
    }

    def list_all(
        self,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        ordering: Optional[str] = None,
    ) -> Tuple[int, List[User]]:
        # Resolve ordering, falling back to full_name
        order_field = "full_name"
        if ordering:
            field = ordering.lstrip("-")
            if field in self._ALLOWED_ORDERINGS:
                order_field = ordering  # keep leading "-" for DESC

        qs = UserModel.objects.prefetch_related("chambers").order_by(order_field)
        if is_active is not None:
            qs = qs.filter(is_active=is_active)
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(username__icontains=search) |
                Q(email__icontains=search)
            )
        total = qs.count()
        offset = (page - 1) * page_size
        users = [self._to_domain(m) for m in qs[offset: offset + page_size]]
        return total, users

    def list_by_role(self, role: UserRole) -> List[User]:
        qs = UserModel.objects.prefetch_related("chambers").filter(
            role=role.value, is_active=True
        ).order_by("full_name")
        return [self._to_domain(m) for m in qs]

    def save(self, user: User, password: Optional[str] = None) -> User:
        try:
            model = UserModel.objects.get(id=user.id)
            model.full_name = user.full_name
            model.email = user.email
            model.role = user.role.value
            model.is_active = user.is_active
            model.supervisor_id = user.supervisor_id
            model.save(update_fields=["full_name", "email", "role", "is_active", "supervisor_id"])
        except UserModel.DoesNotExist:
            model = UserModel.objects.create_user(
                id=user.id,
                username=user.username,
                email=user.email,
                password=password,
                full_name=user.full_name,
                role=user.role.value,
                is_active=user.is_active,
                supervisor_id=user.supervisor_id,
            )
        return self._to_domain(model)

    def set_password(self, user_id: UUID, new_password: str) -> None:
        model = UserModel.objects.get(id=user_id)
        model.set_password(new_password)
        model.save(update_fields=["password"])

    def assign_chambers(self, user_id: UUID, chamber_ids: List[UUID]) -> None:
        model = UserModel.objects.get(id=user_id)
        model.chambers.set(chamber_ids)

    @staticmethod
    def _to_domain(model: UserModel) -> User:
        return User(
            id=model.id,
            username=model.username,
            full_name=model.full_name,
            email=model.email,
            role=UserRole(model.role),
            chamber_ids=[c.id for c in model.chambers.all()],
            is_active=model.is_active,
            supervisor_id=model.supervisor_id,
        )
