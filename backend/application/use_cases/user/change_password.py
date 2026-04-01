import uuid

from django.contrib.auth import authenticate
from domain.repositories.i_unit_of_work import IUnitOfWork
from application.dtos.user_dto import ChangePasswordDTO


class ChangePasswordUseCase:

    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(self, dto: ChangePasswordDTO) -> None:
        with self._uow:
            user = self._uow.users.get_by_id(uuid.UUID(dto.user_id))
            if not user:
                raise ValueError("User not found")

            # Verify old password via Django's authenticate
            auth_user = authenticate(username=user.username, password=dto.old_password)
            if not auth_user:
                raise ValueError("Current password is incorrect")

            if len(dto.new_password) < 8:
                raise ValueError("New password must be at least 8 characters")

            self._uow.users.set_password(uuid.UUID(dto.user_id), dto.new_password)
            self._uow.commit()
