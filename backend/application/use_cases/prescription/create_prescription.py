import logging
import uuid
from datetime import date

from domain.entities.medicine import PrescriptionItem
from domain.entities.prescription import Prescription, PrescriptionStatus
from domain.repositories.i_unit_of_work import IUnitOfWork
from domain.value_objects.dosage import Dosage
from application.dtos.prescription_dto import CreatePrescriptionDTO

logger = logging.getLogger(__name__)


class CreatePrescriptionUseCase:

    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(self, dto: CreatePrescriptionDTO) -> dict:
        follow_up = None
        if dto.follow_up_date:
            follow_up = date.fromisoformat(dto.follow_up_date)

        items = [
            PrescriptionItem(
                medicine_id=uuid.UUID(item.medicine_id),
                medicine_name=item.medicine_name,
                dosage=Dosage(
                    morning=item.morning,
                    afternoon=item.afternoon,
                    evening=item.evening,
                    duration_days=item.duration_days,
                    instructions=item.instructions,
                ),
                route=item.route,
            )
            for item in dto.items
        ]

        requires_approval = dto.prescribed_by_role == "assistant_doctor"
        initial_status = PrescriptionStatus.DRAFT if requires_approval else PrescriptionStatus.ACTIVE

        prescription = Prescription(
            id=uuid.uuid4(),
            consultation_id=uuid.UUID(dto.consultation_id),
            patient_id=uuid.UUID(dto.patient_id),
            prescribed_by_id=uuid.UUID(dto.prescribed_by_id),
            items=items,
            status=initial_status,
            follow_up_date=follow_up,
        )

        with self._uow:
            saved = self._uow.prescriptions.save(prescription)
            self._uow.commit()

        # Auto-schedule follow-up appointment outside the prescription transaction.
        # Only for active (doctor) prescriptions — drafts are scheduled on approval instead.
        if follow_up and initial_status == PrescriptionStatus.ACTIVE:
            self._schedule_follow_up(
                consultation_id=uuid.UUID(dto.consultation_id),
                patient_id=uuid.UUID(dto.patient_id),
                follow_up_date=follow_up,
                created_by_id=uuid.UUID(dto.prescribed_by_id),
            )

        return {
            "prescription_id": str(prescription.id),
            "status": prescription.status.value,
            "item_count": len(prescription.items),
            "follow_up_date": str(follow_up) if follow_up else None,
        }

    def _schedule_follow_up(self, consultation_id, patient_id, follow_up_date, created_by_id):
        from application.use_cases.appointment.schedule_follow_up import ScheduleFollowUpUseCase
        from infrastructure.unit_of_work.django_unit_of_work import DjangoUnitOfWork
        try:
            ScheduleFollowUpUseCase(uow=DjangoUnitOfWork()).execute(
                consultation_id=consultation_id,
                patient_id=patient_id,
                follow_up_date=follow_up_date,
                created_by_id=created_by_id,
            )
        except Exception as exc:
            logger.error("Failed to auto-schedule follow-up appointment: %s", exc)
