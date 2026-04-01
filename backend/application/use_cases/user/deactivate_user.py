import uuid

from domain.repositories.i_unit_of_work import IUnitOfWork


class DeactivateUserUseCase:

    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(self, user_id: str) -> None:
        with self._uow:
            user = self._uow.users.get_by_id(uuid.UUID(user_id))
            if not user:
                raise ValueError("User not found")

            user.is_active = False
            self._uow.users.save(user)
            self._uow.commit()
