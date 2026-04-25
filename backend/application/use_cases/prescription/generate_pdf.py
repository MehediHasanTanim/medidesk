import logging
from datetime import datetime
from uuid import UUID

logger = logging.getLogger(__name__)


class GeneratePrescriptionPDFUseCase:
    """
    Renders a prescription as PDF bytes using WeasyPrint.

    Fetches all required data (prescription, patient, doctor, chamber)
    from the DB directly to keep this self-contained.  The returned
    bytes can be streamed to the client or passed to a notification
    service without writing to disk.
    """

    def execute(self, prescription_id: UUID) -> bytes:
        from django.template.loader import render_to_string
        from weasyprint import HTML

        from infrastructure.orm.models.prescription_model import PrescriptionModel
        from infrastructure.orm.models.doctor_model import DoctorProfileModel

        pm = (
            PrescriptionModel.objects
            .select_related(
                "patient",
                "prescribed_by",
                "consultation__appointment__chamber",
            )
            .prefetch_related("items")
            .get(id=prescription_id)
        )

        patient = pm.patient
        doctor_user = pm.prescribed_by

        doctor_name = doctor_user.full_name
        doctor_qualifications = ""
        doctor_speciality = ""

        try:
            dp = DoctorProfileModel.objects.select_related("speciality").get(user=doctor_user)
            doctor_qualifications = dp.qualifications
            doctor_speciality = dp.speciality.name
        except DoctorProfileModel.DoesNotExist:
            pass

        chamber_name = ""
        chamber_address = ""
        try:
            chamber = pm.consultation.appointment.chamber
            chamber_name = chamber.name
            chamber_address = getattr(chamber, "address", "")
        except Exception:
            pass

        items = [
            {
                "medicine_name": item.medicine_name,
                "morning": item.morning,
                "afternoon": item.afternoon,
                "evening": item.evening,
                "duration_days": item.duration_days,
                "route": item.route,
                "instructions": item.instructions,
            }
            for item in pm.items.all()
        ]

        context = {
            "doctor_name": doctor_name,
            "doctor_qualifications": doctor_qualifications,
            "doctor_speciality": doctor_speciality,
            "chamber_name": chamber_name or "MediDesk Clinic",
            "chamber_address": chamber_address,
            "patient_name": patient.full_name,
            "patient_age": getattr(patient, "age", None) or "",
            "prescription_date": (
                pm.created_at.strftime("%d %b %Y") if pm.created_at else
                datetime.now().strftime("%d %b %Y")
            ),
            "rx_id": str(pm.id)[:8].upper(),
            "items": items,
            "follow_up_date": str(pm.follow_up_date) if pm.follow_up_date else None,
            "generated_at": datetime.now().strftime("%d %b %Y, %I:%M %p"),
        }

        html_string = render_to_string("prescriptions/prescription.html", context)
        pdf_bytes = HTML(string=html_string).write_pdf()
        return pdf_bytes
