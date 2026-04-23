import uuid

from domain.entities.user import User, UserRole
from domain.repositories.i_unit_of_work import IUnitOfWork
from application.dtos.user_dto import CreateUserDTO, UserResponseDTO


class CreateUserUseCase:

    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(self, dto: CreateUserDTO) -> UserResponseDTO:
        with self._uow:
            existing = self._uow.users.get_by_username(dto.username)
            if existing:
                raise ValueError(f"Username '{dto.username}' is already taken")

            supervisor_id = None
            if dto.role == UserRole.ASSISTANT_DOCTOR.value:
                if not dto.supervisor_doctor_id:
                    raise ValueError("A supervisor doctor must be assigned for assistant doctor accounts")
                supervisor = self._uow.users.get_by_id(uuid.UUID(dto.supervisor_doctor_id))
                if not supervisor or supervisor.role != UserRole.DOCTOR:
                    raise ValueError("Supervisor must be an active doctor")
                supervisor_id = supervisor.id

            user = User(
                id=uuid.uuid4(),
                username=dto.username,
                full_name=dto.full_name,
                email=dto.email,
                role=UserRole(dto.role),
                chamber_ids=[uuid.UUID(c) for c in dto.chamber_ids],
                is_active=True,
                supervisor_id=supervisor_id,
            )

            saved = self._uow.users.save(user, password=dto.password)

            if dto.chamber_ids:
                self._uow.users.assign_chambers(saved.id, [uuid.UUID(c) for c in dto.chamber_ids])

            self._uow.commit()

        return UserResponseDTO(
            id=str(saved.id),
            username=saved.username,
            full_name=saved.full_name,
            email=saved.email,
            role=saved.role.value,
            chamber_ids=[str(c) for c in saved.chamber_ids],
            is_active=saved.is_active,
            supervisor_doctor_id=str(saved.supervisor_id) if saved.supervisor_id else None,
        )
