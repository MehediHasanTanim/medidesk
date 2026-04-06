import uuid
from typing import List

from application.dtos.doctor_dto import (
    CreateSpecialityDTO,
    SpecialityDTO,
    UpdateSpecialityDTO,
)
from domain.entities.doctor import Speciality
from domain.repositories.i_doctor_repository import IDoctorRepository


def _to_dto(s: Speciality, doctor_count: int = 0) -> SpecialityDTO:
    return SpecialityDTO(
        id=str(s.id),
        name=s.name,
        description=s.description,
        is_active=s.is_active,
        doctor_count=doctor_count,
    )


class ListSpecialitiesUseCase:

    def __init__(self, repo: IDoctorRepository) -> None:
        self._repo = repo

    def execute(self, active_only: bool = True) -> List[SpecialityDTO]:
        from django.db.models import Count
        from infrastructure.orm.models.doctor_model import DoctorProfileModel
        specialities = self._repo.list_specialities(active_only=active_only)
        # Annotate each with doctor count in one query
        counts = {
            str(row["speciality_id"]): row["cnt"]
            for row in DoctorProfileModel.objects.values("speciality_id").annotate(cnt=Count("id"))
        }
        return [_to_dto(s, counts.get(str(s.id), 0)) for s in specialities]


class CreateSpecialityUseCase:

    def __init__(self, repo: IDoctorRepository) -> None:
        self._repo = repo

    def execute(self, dto: CreateSpecialityDTO) -> SpecialityDTO:
        if self._repo.get_speciality_by_name(dto.name):
            raise ValueError(f"Speciality '{dto.name}' already exists")

        speciality = Speciality(
            id=uuid.uuid4(),
            name=dto.name.strip(),
            description=dto.description.strip(),
        )
        saved = self._repo.save_speciality(speciality)
        return _to_dto(saved)


class UpdateSpecialityUseCase:

    def __init__(self, repo: IDoctorRepository) -> None:
        self._repo = repo

    def execute(self, dto: UpdateSpecialityDTO) -> SpecialityDTO:
        from uuid import UUID
        speciality = self._repo.get_speciality_by_id(UUID(dto.speciality_id))
        if not speciality:
            raise ValueError("Speciality not found")

        if dto.name is not None:
            name = dto.name.strip()
            existing = self._repo.get_speciality_by_name(name)
            if existing and str(existing.id) != dto.speciality_id:
                raise ValueError(f"Speciality '{name}' already exists")
            speciality.name = name

        if dto.description is not None:
            speciality.description = dto.description.strip()

        if dto.is_active is not None:
            speciality.is_active = dto.is_active

        saved = self._repo.save_speciality(speciality)
        return _to_dto(saved)


class DeleteSpecialityUseCase:

    def __init__(self, repo: IDoctorRepository) -> None:
        self._repo = repo

    def execute(self, speciality_id: str) -> None:
        from uuid import UUID
        sid = UUID(speciality_id)

        if not self._repo.get_speciality_by_id(sid):
            raise ValueError("Speciality not found")

        if self._repo.speciality_has_doctors(sid):
            raise ValueError(
                "Cannot delete a speciality that has doctors assigned to it. "
                "Reassign or deactivate those doctors first."
            )

        self._repo.delete_speciality(sid)
