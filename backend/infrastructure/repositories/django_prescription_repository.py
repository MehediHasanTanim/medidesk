from typing import List, Optional
from uuid import UUID

from domain.entities.medicine import PrescriptionItem
from domain.entities.prescription import Prescription, PrescriptionStatus
from domain.repositories.i_prescription_repository import IPrescriptionRepository
from domain.value_objects.dosage import Dosage
from infrastructure.orm.models.prescription_model import PrescriptionItemModel, PrescriptionModel


class DjangoPrescriptionRepository(IPrescriptionRepository):

    def get_by_id(self, prescription_id: UUID) -> Optional[Prescription]:
        try:
            return self._to_domain(
                PrescriptionModel.objects.prefetch_related("items").get(id=prescription_id)
            )
        except PrescriptionModel.DoesNotExist:
            return None

    def get_by_consultation(self, consultation_id: UUID) -> Optional[Prescription]:
        try:
            return self._to_domain(
                PrescriptionModel.objects.prefetch_related("items").get(consultation_id=consultation_id)
            )
        except PrescriptionModel.DoesNotExist:
            return None

    def get_by_patient(self, patient_id: UUID, limit: int = 20) -> List[Prescription]:
        qs = PrescriptionModel.objects.prefetch_related("items").filter(
            patient_id=patient_id
        ).order_by("-created_at")[:limit]
        return [self._to_domain(m) for m in qs]

    def list_pending(self, limit: int = 50) -> List[Prescription]:
        """Return all draft prescriptions awaiting doctor approval."""
        qs = (
            PrescriptionModel.objects.prefetch_related("items")
            .filter(status=PrescriptionStatus.DRAFT.value)
            .order_by("created_at")[:limit]
        )
        return [self._to_domain(m) for m in qs]

    def save(self, prescription: Prescription) -> Prescription:
        model, _ = PrescriptionModel.objects.update_or_create(
            id=prescription.id,
            defaults={
                "consultation_id": prescription.consultation_id,
                "patient_id": prescription.patient_id,
                "prescribed_by_id": prescription.prescribed_by_id,
                "approved_by_id": prescription.approved_by_id,
                "status": prescription.status.value,
                "follow_up_date": prescription.follow_up_date,
                "pdf_path": prescription.pdf_path or "",
            },
        )
        # Replace items
        model.items.all().delete()
        PrescriptionItemModel.objects.bulk_create([
            PrescriptionItemModel(
                prescription=model,
                medicine_id=item.medicine_id,
                medicine_name=item.medicine_name,
                morning=item.dosage.morning,
                afternoon=item.dosage.afternoon,
                evening=item.dosage.evening,
                duration_days=item.dosage.duration_days,
                route=item.route,
                instructions=item.dosage.instructions,
            )
            for item in prescription.items
        ])
        return prescription

    @staticmethod
    def _to_domain(model: PrescriptionModel) -> Prescription:
        items = [
            PrescriptionItem(
                medicine_id=item.medicine_id,
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
            for item in model.items.all()
        ]
        return Prescription(
            id=model.id,
            consultation_id=model.consultation_id,
            patient_id=model.patient_id,
            prescribed_by_id=model.prescribed_by_id,
            approved_by_id=model.approved_by_id,
            items=items,
            status=PrescriptionStatus(model.status),
            follow_up_date=model.follow_up_date,
            pdf_path=model.pdf_path or None,
            created_at=model.created_at,
        )
