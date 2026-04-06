import uuid

from domain.entities.user import Chamber
from domain.repositories.i_unit_of_work import IUnitOfWork
from application.dtos.user_dto import CreateChamberDTO, UpdateChamberDTO


class CreateChamberUseCase:

    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(self, dto: CreateChamberDTO) -> dict:
        chamber = Chamber(
            id=uuid.uuid4(),
            name=dto.name,
            address=dto.address,
            phone=dto.phone,
            latitude=dto.latitude,
            longitude=dto.longitude,
            is_active=True,
        )
        with self._uow:
            saved = self._uow.chambers.save(chamber)
            self._uow.commit()

        return {
            "id": str(saved.id),
            "name": saved.name,
            "address": saved.address,
            "phone": saved.phone,
            "latitude": float(saved.latitude) if saved.latitude is not None else None,
            "longitude": float(saved.longitude) if saved.longitude is not None else None,
            "is_active": saved.is_active,
        }


class UpdateChamberUseCase:

    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(self, dto: UpdateChamberDTO) -> dict:
        with self._uow:
            chamber = self._uow.chambers.get_by_id(uuid.UUID(dto.chamber_id))
            if not chamber:
                raise ValueError("Chamber not found")

            if dto.name is not None:
                chamber.name = dto.name
            if dto.address is not None:
                chamber.address = dto.address
            if dto.phone is not None:
                chamber.phone = dto.phone
            if dto.latitude is not None:
                chamber.latitude = dto.latitude
            if dto.longitude is not None:
                chamber.longitude = dto.longitude
            if dto.is_active is not None:
                chamber.is_active = dto.is_active

            saved = self._uow.chambers.save(chamber)
            self._uow.commit()

        return {
            "id": str(saved.id),
            "name": saved.name,
            "address": saved.address,
            "phone": saved.phone,
            "latitude": float(saved.latitude) if saved.latitude is not None else None,
            "longitude": float(saved.longitude) if saved.longitude is not None else None,
            "is_active": saved.is_active,
        }
