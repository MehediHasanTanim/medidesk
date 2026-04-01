from datetime import date
from typing import List, Optional
from uuid import UUID

from django.db import models as django_models

from domain.entities.appointment import Appointment, AppointmentStatus, AppointmentType
from domain.repositories.i_appointment_repository import IAppointmentRepository
from infrastructure.orm.models.appointment_model import AppointmentModel


class DjangoAppointmentRepository(IAppointmentRepository):

    def get_by_id(self, appointment_id: UUID) -> Optional[Appointment]:
        try:
            return self._to_domain(
                AppointmentModel.objects.select_related("patient", "doctor", "chamber").get(
                    id=appointment_id
                )
            )
        except AppointmentModel.DoesNotExist:
            return None

    def save(self, appointment: Appointment) -> Appointment:
        AppointmentModel.objects.update_or_create(
            id=appointment.id,
            defaults={
                "patient_id": appointment.patient_id,
                "doctor_id": appointment.doctor_id,
                "chamber_id": appointment.chamber_id,
                "scheduled_at": appointment.scheduled_at,
                "appointment_type": appointment.appointment_type.value,
                "status": appointment.status.value,
                "token_number": appointment.token_number,
                "notes": appointment.notes,
                "created_by_id": appointment.created_by_id,
            },
        )
        return appointment

    def get_by_date(self, target_date: date, chamber_id: Optional[UUID] = None) -> List[Appointment]:
        qs = AppointmentModel.objects.filter(
            scheduled_at__date=target_date
        ).select_related("patient").order_by("scheduled_at")
        if chamber_id:
            qs = qs.filter(chamber_id=chamber_id)
        return [self._to_domain(m) for m in qs]

    def get_queue(self, target_date: date, chamber_id: Optional[UUID] = None) -> List[Appointment]:
        qs = AppointmentModel.objects.filter(
            scheduled_at__date=target_date,
            status__in=["confirmed", "in_queue", "in_progress"],
        ).order_by("token_number")
        if chamber_id:
            qs = qs.filter(chamber_id=chamber_id)
        return [self._to_domain(m) for m in qs]

    def get_next_token(self, target_date: date, chamber_id: Optional[UUID] = None) -> int:
        qs = AppointmentModel.objects.filter(
            scheduled_at__date=target_date, token_number__isnull=False
        )
        if chamber_id:
            qs = qs.filter(chamber_id=chamber_id)
        result = qs.aggregate(max_token=django_models.Max("token_number"))
        return (result["max_token"] or 0) + 1

    def get_by_patient(self, patient_id: UUID, limit: int = 20) -> List[Appointment]:
        qs = AppointmentModel.objects.filter(patient_id=patient_id).order_by("-scheduled_at")[:limit]
        return [self._to_domain(m) for m in qs]

    @staticmethod
    def _to_domain(model: AppointmentModel) -> Appointment:
        return Appointment(
            id=model.id,
            patient_id=model.patient_id,
            doctor_id=model.doctor_id,
            chamber_id=model.chamber_id,
            scheduled_at=model.scheduled_at,
            appointment_type=AppointmentType(model.appointment_type),
            status=AppointmentStatus(model.status),
            token_number=model.token_number,
            notes=model.notes,
            created_by_id=model.created_by_id,
            created_at=model.created_at,
        )
