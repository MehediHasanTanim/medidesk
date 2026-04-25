import logging
import uuid
from datetime import timezone as tz, datetime

from domain.entities.appointment import Appointment, AppointmentStatus, AppointmentType
from domain.repositories.i_unit_of_work import IUnitOfWork
from domain.services.i_notification_service import INotificationService
from application.dtos.appointment_dto import AppointmentResponseDTO, WalkInAppointmentDTO

logger = logging.getLogger(__name__)


class WalkInAppointmentUseCase:
    """Create a walk-in appointment and immediately add the patient to the queue.

    Unlike the normal booking flow this skips slot-conflict checking (walk-ins
    arrive unscheduled) and jumps straight to IN_QUEUE status with a token
    assigned, so the receptionist needs only one action.
    """

    def __init__(self, uow: IUnitOfWork, notification_service: INotificationService) -> None:
        self._uow = uow
        self._notification = notification_service

    def execute(self, dto: WalkInAppointmentDTO) -> AppointmentResponseDTO:
        with self._uow:
            patient = self._uow.patients.get_by_id(uuid.UUID(dto.patient_id))
            if not patient:
                raise ValueError(f"Patient {dto.patient_id} not found")

            scheduled_at = datetime.now(tz.utc)
            chamber_id = uuid.UUID(dto.chamber_id) if dto.chamber_id else None
            token = self._uow.appointments.get_next_token(scheduled_at.date(), chamber_id)

            appointment = Appointment(
                id=uuid.uuid4(),
                patient_id=patient.id,
                doctor_id=uuid.UUID(dto.doctor_id),
                chamber_id=chamber_id,
                scheduled_at=scheduled_at,
                appointment_type=AppointmentType.WALK_IN,
                status=AppointmentStatus.IN_QUEUE,
                token_number=token,
                notes=dto.notes,
                created_by_id=uuid.UUID(dto.created_by_id) if dto.created_by_id else None,
            )

            saved = self._uow.appointments.save(appointment)
            self._uow.commit()

        try:
            self._notification.send_appointment_confirmation(patient, saved)
        except Exception as exc:
            logger.error("Notification failed after walk-in booking: %s", exc)

        return AppointmentResponseDTO(
            id=str(saved.id),
            patient_id=str(saved.patient_id),
            patient_name=patient.full_name,
            patient_phone=str(patient.phone),
            doctor_id=str(saved.doctor_id),
            chamber_id=str(saved.chamber_id) if saved.chamber_id else None,
            scheduled_at=saved.scheduled_at.isoformat(),
            appointment_type=saved.appointment_type.value,
            status=saved.status.value,
            token_number=saved.token_number,
            notes=saved.notes,
        )
