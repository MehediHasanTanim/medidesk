import uuid
from datetime import date

from domain.entities.medicine import PrescriptionItem
from domain.entities.prescription import Prescription, PrescriptionStatus
from domain.repositories.i_unit_of_work import IUnitOfWork
from domain.value_objects.dosage import Dosage
from application.dtos.prescription_dto import CreatePrescriptionDTO


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

        prescription = Prescription(
            id=uuid.uuid4(),
            consultation_id=uuid.UUID(dto.consultation_id),
            patient_id=uuid.UUID(dto.patient_id),
            prescribed_by_id=uuid.UUID(dto.prescribed_by_id),
            items=items,
            status=PrescriptionStatus.ACTIVE,
            follow_up_date=follow_up,
        )

        with self._uow:
            saved = self._uow.prescriptions.save(prescription)
            self._uow.commit()

        return {
            "prescription_id": str(prescription.id),
            "status": prescription.status.value,
            "item_count": len(prescription.items),
            "follow_up_date": str(follow_up) if follow_up else None,
        }
