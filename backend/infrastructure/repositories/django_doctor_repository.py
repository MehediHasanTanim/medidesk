from typing import List, Optional
from uuid import UUID

from django.db.models import Q

from domain.entities.doctor import DoctorProfile, Speciality
from domain.repositories.i_doctor_repository import IDoctorRepository
from infrastructure.orm.mappers.doctor_mapper import DoctorProfileMapper, SpecialityMapper
from infrastructure.orm.models.doctor_model import DoctorProfileModel, SpecialityModel


class DjangoDoctorRepository(IDoctorRepository):

    # ── Specialities ──────────────────────────────────────────────────────────

    def get_speciality_by_id(self, speciality_id: UUID) -> Optional[Speciality]:
        try:
            return SpecialityMapper.to_domain(
                SpecialityModel.objects.get(id=speciality_id)
            )
        except SpecialityModel.DoesNotExist:
            return None

    def get_speciality_by_name(self, name: str) -> Optional[Speciality]:
        m = SpecialityModel.objects.filter(name__iexact=name).first()
        return SpecialityMapper.to_domain(m) if m else None

    def list_specialities(self, active_only: bool = True) -> List[Speciality]:
        qs = SpecialityModel.objects.all()
        if active_only:
            qs = qs.filter(is_active=True)
        return [SpecialityMapper.to_domain(m) for m in qs]

    def save_speciality(self, speciality: Speciality) -> Speciality:
        model, _ = SpecialityModel.objects.update_or_create(
            id=speciality.id,
            defaults=SpecialityMapper.to_model_data(speciality),
        )
        return SpecialityMapper.to_domain(model)

    def delete_speciality(self, speciality_id: UUID) -> None:
        SpecialityModel.objects.filter(id=speciality_id).delete()

    def speciality_has_doctors(self, speciality_id: UUID) -> bool:
        return DoctorProfileModel.objects.filter(speciality_id=speciality_id).exists()

    # ── Doctor profiles ───────────────────────────────────────────────────────

    def get_profile_by_id(self, profile_id: UUID) -> Optional[DoctorProfile]:
        try:
            return DoctorProfileMapper.to_domain(
                DoctorProfileModel.objects.get(id=profile_id)
            )
        except DoctorProfileModel.DoesNotExist:
            return None

    def get_profile_by_user_id(self, user_id: UUID) -> Optional[DoctorProfile]:
        try:
            return DoctorProfileMapper.to_domain(
                DoctorProfileModel.objects.get(user_id=user_id)
            )
        except DoctorProfileModel.DoesNotExist:
            return None

    def list_profiles(
        self,
        speciality_id: Optional[UUID] = None,
        is_available: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> List[DoctorProfile]:
        qs = DoctorProfileModel.objects.select_related("user", "speciality").order_by(
            "user__full_name"
        )
        if speciality_id is not None:
            qs = qs.filter(speciality_id=speciality_id)
        if is_available is not None:
            qs = qs.filter(is_available=is_available)
        if search:
            qs = qs.filter(
                Q(user__full_name__icontains=search)
                | Q(qualifications__icontains=search)
                | Q(speciality__name__icontains=search)
            )
        return [DoctorProfileMapper.to_domain(m) for m in qs]

    def save_profile(self, profile: DoctorProfile) -> DoctorProfile:
        model, _ = DoctorProfileModel.objects.update_or_create(
            id=profile.id,
            defaults=DoctorProfileMapper.to_model_data(profile),
        )
        return DoctorProfileMapper.to_domain(model)
