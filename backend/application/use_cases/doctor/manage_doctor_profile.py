import uuid
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from application.dtos.doctor_dto import (
    CreateDoctorProfileDTO,
    DoctorProfileDTO,
    UpdateDoctorProfileDTO,
)
from domain.entities.doctor import DoctorProfile
from domain.repositories.i_doctor_repository import IDoctorRepository


def _profile_to_dto(profile: DoctorProfile, repo: IDoctorRepository) -> DoctorProfileDTO:
    """Build a DoctorProfileDTO by joining profile with user and speciality data."""
    from infrastructure.orm.models.doctor_model import DoctorProfileModel
    from infrastructure.orm.models.user_model import UserModel, ChamberModel

    m = DoctorProfileModel.objects.select_related("user", "speciality").get(
        id=profile.id
    )
    chamber_ids = list(
        m.user.chambers.values_list("id", flat=True)
    )

    return DoctorProfileDTO(
        id=str(m.id),
        user_id=str(m.user_id),
        username=m.user.username,
        full_name=m.user.full_name,
        email=m.user.email,
        role=m.user.role,
        is_active=m.user.is_active,
        speciality_id=str(m.speciality_id),
        speciality_name=m.speciality.name,
        qualifications=m.qualifications,
        bio=m.bio,
        consultation_fee=float(m.consultation_fee) if m.consultation_fee is not None else None,
        experience_years=m.experience_years,
        is_available=m.is_available,
        visit_days=m.visit_days or [],
        visit_time_start=m.visit_time_start.strftime("%H:%M") if m.visit_time_start else None,
        visit_time_end=m.visit_time_end.strftime("%H:%M") if m.visit_time_end else None,
        chamber_ids=[str(c) for c in chamber_ids],
    )


class ListDoctorProfilesUseCase:

    def __init__(self, repo: IDoctorRepository) -> None:
        self._repo = repo

    def execute(
        self,
        speciality_id: Optional[str] = None,
        is_available: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> List[DoctorProfileDTO]:
        sid = UUID(speciality_id) if speciality_id else None
        profiles = self._repo.list_profiles(
            speciality_id=sid,
            is_available=is_available,
            search=search,
        )
        return [_profile_to_dto(p, self._repo) for p in profiles]


class GetDoctorProfileUseCase:

    def __init__(self, repo: IDoctorRepository) -> None:
        self._repo = repo

    def execute(self, profile_id: str) -> DoctorProfileDTO:
        profile = self._repo.get_profile_by_id(UUID(profile_id))
        if not profile:
            raise ValueError("Doctor profile not found")
        return _profile_to_dto(profile, self._repo)


class CreateDoctorProfileUseCase:
    """Creates a new User (role=doctor/assistant_doctor) and their DoctorProfile atomically."""

    def __init__(self, repo: IDoctorRepository) -> None:
        self._repo = repo

    def execute(self, dto: CreateDoctorProfileDTO) -> DoctorProfileDTO:
        from django.db import transaction
        from infrastructure.orm.models.user_model import UserModel

        if dto.role not in ("doctor", "assistant_doctor"):
            raise ValueError("Role must be 'doctor' or 'assistant_doctor'")

        # Validate speciality exists
        speciality = self._repo.get_speciality_by_id(UUID(dto.speciality_id))
        if not speciality:
            raise ValueError("Speciality not found")

        # Check username uniqueness
        if UserModel.objects.filter(username=dto.username).exists():
            raise ValueError(f"Username '{dto.username}' is already taken")

        with transaction.atomic():
            # 1. Create user
            user = UserModel(
                id=uuid.uuid4(),
                username=dto.username,
                full_name=dto.full_name.strip(),
                email=dto.email,
                role=dto.role,
            )
            user.set_password(dto.password)
            user.save()

            # 2. Assign chambers
            if dto.chamber_ids:
                from infrastructure.orm.models.user_model import ChamberModel
                chambers = ChamberModel.objects.filter(id__in=dto.chamber_ids)
                user.chambers.set(chambers)

            # 3. Create profile
            profile = DoctorProfile(
                id=uuid.uuid4(),
                user_id=user.id,
                speciality_id=UUID(dto.speciality_id),
                qualifications=dto.qualifications.strip(),
                bio=dto.bio.strip(),
                consultation_fee=Decimal(str(dto.consultation_fee)) if dto.consultation_fee is not None else None,
                experience_years=dto.experience_years,
                is_available=dto.is_available,
                visit_days=dto.visit_days or [],
                visit_time_start=_parse_time(dto.visit_time_start),
                visit_time_end=_parse_time(dto.visit_time_end),
            )
            saved = self._repo.save_profile(profile)

        return _profile_to_dto(saved, self._repo)


class UpdateDoctorProfileUseCase:

    def __init__(self, repo: IDoctorRepository) -> None:
        self._repo = repo

    def execute(self, dto: UpdateDoctorProfileDTO) -> DoctorProfileDTO:
        from django.db import transaction
        from infrastructure.orm.models.user_model import UserModel, ChamberModel

        profile = self._repo.get_profile_by_id(UUID(dto.profile_id))
        if not profile:
            raise ValueError("Doctor profile not found")

        with transaction.atomic():
            user = UserModel.objects.get(id=profile.user_id)

            # Update user fields
            if dto.full_name is not None:
                user.full_name = dto.full_name.strip()
            if dto.email is not None:
                user.email = dto.email
            if dto.role is not None:
                if dto.role not in ("doctor", "assistant_doctor"):
                    raise ValueError("Role must be 'doctor' or 'assistant_doctor'")
                user.role = dto.role
            if dto.is_active is not None:
                user.is_active = dto.is_active
            user.save()

            # Update chambers
            if dto.chamber_ids is not None:
                chambers = ChamberModel.objects.filter(id__in=dto.chamber_ids)
                user.chambers.set(chambers)

            # Update profile fields
            if dto.speciality_id is not None:
                speciality = self._repo.get_speciality_by_id(UUID(dto.speciality_id))
                if not speciality:
                    raise ValueError("Speciality not found")
                profile.speciality_id = UUID(dto.speciality_id)
            if dto.qualifications is not None:
                profile.qualifications = dto.qualifications.strip()
            if dto.bio is not None:
                profile.bio = dto.bio.strip()
            if dto.consultation_fee is not None:
                profile.consultation_fee = Decimal(str(dto.consultation_fee))
            if dto.experience_years is not None:
                profile.experience_years = dto.experience_years
            if dto.is_available is not None:
                profile.is_available = dto.is_available
            if dto.visit_days is not None:
                profile.visit_days = dto.visit_days
            if dto.visit_time_start is not None:
                profile.visit_time_start = _parse_time(dto.visit_time_start)
            if dto.visit_time_end is not None:
                profile.visit_time_end = _parse_time(dto.visit_time_end)

            saved = self._repo.save_profile(profile)

        return _profile_to_dto(saved, self._repo)


def _parse_time(value: Optional[str]):
    """Parse 'HH:MM' string to datetime.time, or return None."""
    if not value:
        return None
    from datetime import time
    h, m = value.split(":")
    return time(int(h), int(m))
