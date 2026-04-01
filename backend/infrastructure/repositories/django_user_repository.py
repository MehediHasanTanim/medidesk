from typing import List, Optional
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

    def list_all(self, is_active: Optional[bool] = None) -> List[User]:
        qs = UserModel.objects.prefetch_related("chambers").order_by("full_name")
        if is_active is not None:
            qs = qs.filter(is_active=is_active)
        return [self._to_domain(m) for m in qs]

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
            model.save(update_fields=["full_name", "email", "role", "is_active"])
        except UserModel.DoesNotExist:
            model = UserModel.objects.create_user(
                id=user.id,
                username=user.username,
                email=user.email,
                password=password,
                full_name=user.full_name,
                role=user.role.value,
                is_active=user.is_active,
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
        )
