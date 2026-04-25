import logging
from uuid import UUID

logger = logging.getLogger(__name__)


class SendPrescriptionUseCase:
    """
    Generates a prescription PDF then dispatches it via all configured
    notification channels (WhatsApp text + email with PDF attachment).

    channels: "all" | "whatsapp" | "email"
    """

    def execute(self, prescription_id: UUID, channels: str = "all") -> dict:
        from infrastructure.orm.models.prescription_model import PrescriptionModel
        from infrastructure.orm.models.patient_model import PatientModel
        from infrastructure.services.email_service import EmailNotificationService
        from infrastructure.services.whatsapp_service import WhatsAppNotificationService
        from infrastructure.services.notification_composite import CompositeNotificationService
        from infrastructure.repositories.django_prescription_repository import DjangoPrescriptionRepository
        from application.use_cases.prescription.generate_pdf import GeneratePrescriptionPDFUseCase

        try:
            pdf_bytes = GeneratePrescriptionPDFUseCase().execute(prescription_id)
        except Exception as exc:
            logger.error("PDF generation failed for prescription %s: %s", prescription_id, exc)
            raise ValueError(f"PDF generation failed: {exc}") from exc

        prescription = DjangoPrescriptionRepository().get_by_id(prescription_id)
        if not prescription:
            raise ValueError("Prescription not found")

        try:
            patient_model = PatientModel.objects.get(id=prescription.patient_id)
        except PatientModel.DoesNotExist:
            raise ValueError("Patient not found")

        from domain.entities.patient import Patient
        patient = Patient(
            id=patient_model.id,
            full_name=patient_model.full_name,
            phone=patient_model.phone,
            email=getattr(patient_model, "email", None) or "",
            address=getattr(patient_model, "address", ""),
        )

        services = []
        if channels in ("all", "whatsapp"):
            services.append(WhatsAppNotificationService())
        if channels in ("all", "email"):
            services.append(EmailNotificationService())

        composite = CompositeNotificationService(services)
        success = composite.send_prescription(patient, prescription, pdf_bytes)

        return {
            "prescription_id": str(prescription_id),
            "channels": channels,
            "success": success,
            "pdf_size_bytes": len(pdf_bytes),
        }
