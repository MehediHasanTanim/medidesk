import uuid
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from application.dtos.doctor_dto import (
    ChamberScheduleDTO,
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

    m = DoctorProfileModel.objects.select_related("user", "speciality").prefetch_related(
        "chamber_schedules"
    ).get(id=profile.id)
    chamber_ids = list(
        m.user.chambers.values_list("id", flat=True)
    )

    chamber_schedules = [
        ChamberScheduleDTO(
            chamber_id=str(cs.chamber_id),
            visit_days=cs.visit_days or [],
            visit_time_start=cs.visit_time_start.strftime("%H:%M") if cs.visit_time_start else None,
            visit_time_end=cs.visit_time_end.strftime("%H:%M") if cs.visit_time_end else None,
        )
        for cs in m.chamber_schedules.all()
    ]

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
        supervisor_doctor_id=str(m.user.supervisor_id) if m.user.supervisor_id else None,
        profile_complete=True,
        chamber_schedules=chamber_schedules,
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

        supervisor = None
        if dto.role == "assistant_doctor":
            if not dto.supervisor_doctor_id:
                raise ValueError("A supervisor doctor must be assigned for assistant doctor accounts")
            try:
                supervisor = UserModel.objects.get(id=dto.supervisor_doctor_id, role="doctor")
            except UserModel.DoesNotExist:
                raise ValueError("Supervisor must be an active doctor")

        with transaction.atomic():
            if dto.existing_user_id:
                # Adding a profile to an already-existing user (created via Users menu)
                try:
                    user = UserModel.objects.get(id=dto.existing_user_id)
                except UserModel.DoesNotExist:
                    raise ValueError("User not found")
                if user.role not in ("doctor", "assistant_doctor"):
                    raise ValueError("User does not have a doctor role")
                if supervisor:
                    user.supervisor = supervisor
                    user.save(update_fields=["supervisor"])
            else:
                # Check username uniqueness for new user
                if UserModel.objects.filter(username=dto.username).exists():
                    raise ValueError(f"Username '{dto.username}' is already taken")

                # 1. Create new user
                user = UserModel(
                    id=uuid.uuid4(),
                    username=dto.username,
                    full_name=dto.full_name.strip(),
                    email=dto.email,
                    role=dto.role,
                    supervisor=supervisor,
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

            # 4. Save per-chamber schedules
            _sync_chamber_schedules(saved.id, dto.chamber_schedules)

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

            # Resolve supervisor
            effective_role = user.role
            if dto.supervisor_doctor_id is not None:
                if dto.supervisor_doctor_id == "":
                    user.supervisor = None
                else:
                    try:
                        user.supervisor = UserModel.objects.get(id=dto.supervisor_doctor_id, role="doctor")
                    except UserModel.DoesNotExist:
                        raise ValueError("Supervisor must be an active doctor")
            elif effective_role != "assistant_doctor":
                user.supervisor = None

            if effective_role == "assistant_doctor" and not user.supervisor_id:
                raise ValueError("A supervisor doctor must be assigned for assistant doctor accounts")

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

            # Sync per-chamber schedules when provided
            if dto.chamber_schedules is not None:
                _sync_chamber_schedules(saved.id, dto.chamber_schedules)

        return _profile_to_dto(saved, self._repo)


def _sync_chamber_schedules(profile_id, schedules: Optional[List]) -> None:
    """Replace all chamber schedules for a doctor profile with the provided list."""
    from infrastructure.orm.models.doctor_model import DoctorChamberScheduleModel

    if schedules is None:
        return

    # Delete existing and re-create (simple replace semantics)
    DoctorChamberScheduleModel.objects.filter(doctor_profile_id=profile_id).delete()
    for cs in schedules:
        if not cs:
            continue
        DoctorChamberScheduleModel.objects.create(
            doctor_profile_id=profile_id,
            chamber_id=cs.chamber_id,
            visit_days=cs.visit_days or [],
            visit_time_start=_parse_time(cs.visit_time_start),
            visit_time_end=_parse_time(cs.visit_time_end),
        )


def _parse_time(value: Optional[str]):
    """Parse 'HH:MM' string to datetime.time, or return None."""
    if not value:
        return None
    from datetime import time
    h, m = value.split(":")
    return time(int(h), int(m))
