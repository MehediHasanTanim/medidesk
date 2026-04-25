import logging
import uuid
from datetime import date, datetime, time, timezone as tz
from typing import Optional
from uuid import UUID

from domain.entities.appointment import Appointment, AppointmentStatus, AppointmentType
from domain.repositories.i_unit_of_work import IUnitOfWork

logger = logging.getLogger(__name__)

_DEFAULT_VISIT_TIME = time(9, 0)  # fallback when doctor has no schedule


class ScheduleFollowUpUseCase:
    """Create a follow-up appointment from a prescription's follow_up_date.

    Looks up the consultation to find doctor_id and chamber_id, then resolves
    the doctor's visit_time_start for that chamber (falls back to 09:00).
    Slot-conflict checking is intentionally skipped — follow-up appointments
    should never silently fail when a prescription is saved or approved.
    """

    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(
        self,
        consultation_id: UUID,
        patient_id: UUID,
        follow_up_date: date,
        created_by_id: Optional[UUID] = None,
    ) -> Optional[Appointment]:
        with self._uow:
            consultation = self._uow.consultations.get_by_id(consultation_id)
            if not consultation:
                logger.warning("ScheduleFollowUp: consultation %s not found", consultation_id)
                return None

            appointment = self._uow.appointments.get_by_id(consultation.appointment_id)
            chamber_id = appointment.chamber_id if appointment else None
            doctor_id = consultation.doctor_id

            visit_start = self._resolve_visit_time(doctor_id, chamber_id)
            scheduled_at = datetime.combine(follow_up_date, visit_start, tzinfo=tz.utc)

            patient = self._uow.patients.get_by_id(patient_id)
            if not patient:
                logger.warning("ScheduleFollowUp: patient %s not found", patient_id)
                return None

            token = self._uow.appointments.get_next_token(follow_up_date, chamber_id)

            follow_up = Appointment(
                id=uuid.uuid4(),
                patient_id=patient_id,
                doctor_id=doctor_id,
                chamber_id=chamber_id,
                scheduled_at=scheduled_at,
                appointment_type=AppointmentType.FOLLOW_UP,
                status=AppointmentStatus.SCHEDULED,
                token_number=token,
                notes=f"Auto-scheduled follow-up from prescription",
                created_by_id=created_by_id,
            )

            saved = self._uow.appointments.save(follow_up)
            self._uow.commit()

        logger.info(
            "ScheduleFollowUp: created appointment %s for patient %s on %s",
            saved.id, patient_id, follow_up_date,
        )
        return saved

    def _resolve_visit_time(self, doctor_id: UUID, chamber_id: Optional[UUID]) -> time:
        """Return the doctor's visit_time_start for the chamber, or 09:00 as fallback."""
        if not chamber_id:
            return _DEFAULT_VISIT_TIME
        try:
            from infrastructure.orm.models.doctor_model import DoctorChamberScheduleModel
            schedule = DoctorChamberScheduleModel.objects.filter(
                doctor_profile__user_id=doctor_id,
                chamber_id=chamber_id,
                visit_time_start__isnull=False,
            ).values_list("visit_time_start", flat=True).first()
            return schedule if schedule else _DEFAULT_VISIT_TIME
        except Exception as exc:
            logger.warning("ScheduleFollowUp: could not fetch doctor schedule: %s", exc)
            return _DEFAULT_VISIT_TIME
