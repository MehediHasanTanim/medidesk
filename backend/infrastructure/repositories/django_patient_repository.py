from typing import List, Optional
from uuid import UUID

from django.db.models import Q

from domain.entities.patient import Patient
from domain.repositories.i_patient_repository import IPatientRepository
from domain.value_objects.phone_number import PhoneNumber
from infrastructure.orm.mappers.patient_mapper import PatientMapper
from infrastructure.orm.models.patient_model import PatientModel


class DjangoPatientRepository(IPatientRepository):

    def get_by_id(self, patient_id: UUID) -> Optional[Patient]:
        try:
            return PatientMapper.to_domain(PatientModel.objects.get(id=patient_id))
        except PatientModel.DoesNotExist:
            return None

    def get_by_phone(self, phone: PhoneNumber) -> Optional[Patient]:
        """Returns the first patient with this phone number, or None.
        Phone is no longer unique — multiple patients (e.g. siblings) may share a number."""
        m = PatientModel.objects.filter(phone=str(phone)).first()
        return PatientMapper.to_domain(m) if m else None

    def get_by_patient_code(self, code: str) -> Optional[Patient]:
        try:
            return PatientMapper.to_domain(PatientModel.objects.get(patient_id=code))
        except PatientModel.DoesNotExist:
            return None

    def save(self, patient: Patient) -> Patient:
        model, _ = PatientModel.objects.update_or_create(
            id=patient.id,
            defaults=PatientMapper.to_model_data(patient),
        )
        return PatientMapper.to_domain(model)

    def search(self, query: str, limit: int = 20, offset: int = 0) -> List[Patient]:
        qs = PatientModel.objects.filter(
            Q(full_name__icontains=query) | Q(phone__icontains=query) | Q(patient_id__icontains=query),
            is_active=True,
        ).order_by("full_name")[offset : offset + limit]
        return [PatientMapper.to_domain(m) for m in qs]

    def list_all(self, limit: int = 50, offset: int = 0) -> List[Patient]:
        qs = PatientModel.objects.filter(is_active=True).order_by("-created_at")[offset : offset + limit]
        return [PatientMapper.to_domain(m) for m in qs]

    def list_by_doctor(self, doctor_id: UUID, limit: int = 50, offset: int = 0) -> List[Patient]:
        """Return patients who have at least one appointment with the given doctor."""
        qs = (
            PatientModel.objects.filter(is_active=True, appointments__doctor_id=doctor_id)
            .distinct()
            .order_by("-created_at")[offset : offset + limit]
        )
        return [PatientMapper.to_domain(m) for m in qs]

    def search_by_doctor(self, query: str, doctor_id: UUID, limit: int = 20, offset: int = 0) -> List[Patient]:
        """Search patients scoped to those with appointments under the given doctor."""
        qs = (
            PatientModel.objects.filter(
                Q(full_name__icontains=query) | Q(phone__icontains=query) | Q(patient_id__icontains=query),
                is_active=True,
                appointments__doctor_id=doctor_id,
            )
            .distinct()
            .order_by("full_name")[offset : offset + limit]
        )
        return [PatientMapper.to_domain(m) for m in qs]

    def has_appointment_with_doctor(self, patient_id: UUID, doctor_id: UUID) -> bool:
        """Check whether a patient has any appointment with the given doctor."""
        return PatientModel.objects.filter(
            id=patient_id, appointments__doctor_id=doctor_id
        ).exists()
