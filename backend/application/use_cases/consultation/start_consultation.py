import uuid

from domain.entities.consultation import Consultation
from domain.entities.appointment import AppointmentStatus
from domain.repositories.i_unit_of_work import IUnitOfWork
from application.dtos.consultation_dto import StartConsultationDTO


class StartConsultationUseCase:

    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(self, dto: StartConsultationDTO) -> dict:
        with self._uow:
            appointment = self._uow.appointments.get_by_id(uuid.UUID(dto.appointment_id))
            if not appointment:
                raise ValueError("Appointment not found")

            appointment.mark_in_progress()
            self._uow.appointments.save(appointment)

            consultation = Consultation(
                id=uuid.uuid4(),
                appointment_id=uuid.UUID(dto.appointment_id),
                patient_id=uuid.UUID(dto.patient_id),
                doctor_id=uuid.UUID(dto.doctor_id),
                chief_complaints=dto.chief_complaints,
            )
            self._uow.consultations.save(consultation)
            self._uow.commit()

        return {"consultation_id": str(consultation.id), "status": "started"}
