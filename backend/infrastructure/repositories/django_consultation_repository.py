from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from domain.entities.consultation import Consultation
from domain.repositories.i_consultation_repository import IConsultationRepository
from domain.value_objects.vitals import Vitals
from infrastructure.orm.models.consultation_model import ConsultationModel


class DjangoConsultationRepository(IConsultationRepository):

    _qs = ConsultationModel.objects.select_related("appointment")

    def get_by_id(self, consultation_id: UUID) -> Optional[Consultation]:
        try:
            return self._to_domain(self._qs.get(id=consultation_id))
        except ConsultationModel.DoesNotExist:
            return None

    def get_by_appointment(self, appointment_id: UUID) -> Optional[Consultation]:
        try:
            return self._to_domain(self._qs.get(appointment_id=appointment_id))
        except ConsultationModel.DoesNotExist:
            return None

    def get_by_patient(self, patient_id: UUID, limit: int = 20) -> List[Consultation]:
        qs = self._qs.filter(patient_id=patient_id).order_by("-created_at")[:limit]
        return [self._to_domain(m) for m in qs]

    def save(self, consultation: Consultation) -> Consultation:
        vitals = consultation.vitals
        ConsultationModel.objects.update_or_create(
            id=consultation.id,
            defaults={
                "appointment_id": consultation.appointment_id,
                "patient_id": consultation.patient_id,
                "doctor_id": consultation.doctor_id,
                "chief_complaints": consultation.chief_complaints,
                "clinical_findings": consultation.clinical_findings,
                "diagnosis": consultation.diagnosis,
                "notes": consultation.notes,
                "bp_systolic": vitals.blood_pressure_systolic if vitals else None,
                "bp_diastolic": vitals.blood_pressure_diastolic if vitals else None,
                "pulse": vitals.pulse if vitals else None,
                "temperature": vitals.temperature if vitals else None,
                "weight": vitals.weight if vitals else None,
                "height": vitals.height if vitals else None,
                "spo2": vitals.spo2 if vitals else None,
                "is_draft": consultation.is_draft,
                "completed_at": consultation.completed_at,
            },
        )
        return consultation

    @staticmethod
    def _to_domain(model: ConsultationModel) -> Consultation:
        vitals = None
        if any([model.bp_systolic, model.pulse, model.temperature, model.weight]):
            vitals = Vitals(
                blood_pressure_systolic=model.bp_systolic,
                blood_pressure_diastolic=model.bp_diastolic,
                pulse=model.pulse,
                temperature=Decimal(str(model.temperature)) if model.temperature else None,
                weight=Decimal(str(model.weight)) if model.weight else None,
                height=Decimal(str(model.height)) if model.height else None,
                spo2=model.spo2,
            )
        return Consultation(
            id=model.id,
            appointment_id=model.appointment_id,
            patient_id=model.patient_id,
            doctor_id=model.doctor_id,
            appointment_doctor_id=model.appointment.doctor_id,
            chief_complaints=model.chief_complaints,
            clinical_findings=model.clinical_findings,
            diagnosis=model.diagnosis,
            notes=model.notes,
            vitals=vitals,
            is_draft=model.is_draft,
            created_at=model.created_at,
            completed_at=model.completed_at,
        )
