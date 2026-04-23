import uuid

from domain.entities.user import UserRole
from domain.repositories.i_unit_of_work import IUnitOfWork
from application.dtos.user_dto import UpdateUserDTO, UserResponseDTO


class UpdateUserUseCase:

    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(self, dto: UpdateUserDTO) -> UserResponseDTO:
        with self._uow:
            user = self._uow.users.get_by_id(uuid.UUID(dto.user_id))
            if not user:
                raise ValueError("User not found")

            if dto.full_name is not None:
                user.full_name = dto.full_name
            if dto.email is not None:
                user.email = dto.email
            if dto.role is not None:
                user.role = UserRole(dto.role)
            if dto.is_active is not None:
                user.is_active = dto.is_active

            # Resolve effective role after potential update
            effective_role = user.role
            if dto.supervisor_doctor_id is not None:
                if dto.supervisor_doctor_id == "":
                    user.supervisor_id = None
                else:
                    supervisor = self._uow.users.get_by_id(uuid.UUID(dto.supervisor_doctor_id))
                    if not supervisor or supervisor.role != UserRole.DOCTOR:
                        raise ValueError("Supervisor must be an active doctor")
                    user.supervisor_id = supervisor.id
            elif effective_role != UserRole.ASSISTANT_DOCTOR:
                # Clear supervisor when role changes away from assistant_doctor
                user.supervisor_id = None

            if effective_role == UserRole.ASSISTANT_DOCTOR and not user.supervisor_id:
                raise ValueError("A supervisor doctor must be assigned for assistant doctor accounts")

            saved = self._uow.users.save(user)

            if dto.chamber_ids is not None:
                chamber_uuids = [uuid.UUID(c) for c in dto.chamber_ids]
                self._uow.users.assign_chambers(saved.id, chamber_uuids)
                saved.chamber_ids = chamber_uuids

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
