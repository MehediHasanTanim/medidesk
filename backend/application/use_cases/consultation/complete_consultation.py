import uuid

from domain.entities.appointment import AppointmentStatus
from domain.repositories.i_unit_of_work import IUnitOfWork
from domain.value_objects.vitals import Vitals
from application.dtos.consultation_dto import CompleteConsultationDTO


class CompleteConsultationUseCase:

    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(self, dto: CompleteConsultationDTO) -> dict:
        with self._uow:
            consultation = self._uow.consultations.get_by_id(uuid.UUID(dto.consultation_id))
            if not consultation:
                raise ValueError("Consultation not found")

            consultation.diagnosis = dto.diagnosis
            consultation.clinical_findings = dto.clinical_findings
            consultation.notes = dto.notes
            consultation.vitals = Vitals(
                blood_pressure_systolic=dto.bp_systolic,
                blood_pressure_diastolic=dto.bp_diastolic,
                pulse=dto.pulse,
                temperature=dto.temperature,
                weight=dto.weight,
                height=dto.height,
                spo2=dto.spo2,
            )
            consultation.complete()  # enforces domain rule: diagnosis required

            appointment = self._uow.appointments.get_by_id(consultation.appointment_id)
            if appointment:
                appointment.status = AppointmentStatus.COMPLETED
                self._uow.appointments.save(appointment)

            self._uow.consultations.save(consultation)
            self._uow.commit()

        return {"consultation_id": str(consultation.id), "status": "completed"}
