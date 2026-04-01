import logging

from django.core.mail import EmailMessage

from domain.entities.appointment import Appointment
from domain.entities.patient import Patient
from domain.entities.prescription import Prescription
from domain.services.i_notification_service import INotificationService

logger = logging.getLogger(__name__)


class EmailNotificationService(INotificationService):

    def send_appointment_confirmation(self, patient: Patient, appointment: Appointment) -> bool:
        if not patient.email:
            return False
        body = (
            f"Dear {patient.full_name},\n\n"
            f"Your appointment has been confirmed.\n"
            f"Date & Time: {appointment.scheduled_at:%d %b %Y, %I:%M %p}\n"
            f"Token No: {appointment.token_number}\n\n"
            f"Thank you,\nMediDesk"
        )
        return self._send(patient.email, "Appointment Confirmed — MediDesk", body)

    def send_appointment_reminder(self, patient: Patient, appointment: Appointment) -> bool:
        if not patient.email:
            return False
        body = (
            f"Dear {patient.full_name},\n\n"
            f"This is a reminder for your appointment tomorrow at {appointment.scheduled_at:%I:%M %p}.\n"
            f"Token No: {appointment.token_number}\n\nThank you,\nMediDesk"
        )
        return self._send(patient.email, "Appointment Reminder — MediDesk", body)

    def send_prescription(self, patient: Patient, prescription: Prescription, pdf_bytes: bytes) -> bool:
        if not patient.email:
            return False
        msg = EmailMessage(
            subject="Your Prescription — MediDesk",
            body=f"Dear {patient.full_name},\n\nPlease find your prescription attached.",
            to=[patient.email],
        )
        msg.attach("prescription.pdf", pdf_bytes, "application/pdf")
        try:
            msg.send()
            return True
        except Exception as exc:
            logger.error("Email prescription send failed: %s", exc)
            return False

    def send_follow_up_reminder(self, patient: Patient, follow_up_date: str) -> bool:
        if not patient.email:
            return False
        body = f"Dear {patient.full_name},\n\nYour follow-up visit is due on {follow_up_date}.\n\nMediDesk"
        return self._send(patient.email, "Follow-up Reminder — MediDesk", body)

    @staticmethod
    def _send(to: str, subject: str, body: str) -> bool:
        try:
            msg = EmailMessage(subject=subject, body=body, to=[to])
            msg.send()
            return True
        except Exception as exc:
            logger.error("Email send failed to %s: %s", to, exc)
            return False
