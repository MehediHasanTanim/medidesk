import logging
import os

import requests

from domain.entities.appointment import Appointment
from domain.entities.patient import Patient
from domain.entities.prescription import Prescription
from domain.services.i_notification_service import INotificationService

logger = logging.getLogger(__name__)


class WhatsAppNotificationService(INotificationService):
    """Meta WhatsApp Business Cloud API implementation."""

    def __init__(self) -> None:
        self._api_url = os.getenv("WHATSAPP_API_URL", "")
        self._token = os.getenv("WHATSAPP_API_TOKEN", "")

    def _send_text(self, to: str, message: str) -> bool:
        if not self._api_url or not self._token:
            logger.warning("WhatsApp API not configured — skipping send")
            return False
        try:
            payload = {
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {"body": message},
            }
            resp = requests.post(
                self._api_url,
                json=payload,
                headers={"Authorization": f"Bearer {self._token}"},
                timeout=10,
            )
            resp.raise_for_status()
            return True
        except Exception as exc:
            logger.error("WhatsApp send failed: %s", exc)
            return False

    def send_appointment_confirmation(self, patient: Patient, appointment: Appointment) -> bool:
        msg = (
            f"প্রিয় {patient.full_name},\n"
            f"আপনার অ্যাপয়েন্টমেন্ট নিশ্চিত করা হয়েছে।\n"
            f"তারিখ: {appointment.scheduled_at:%d %b %Y, %I:%M %p}\n"
            f"টোকেন নং: {appointment.token_number}\n\n"
            f"Dear {patient.full_name},\n"
            f"Appointment confirmed.\n"
            f"Date: {appointment.scheduled_at:%d %b %Y, %I:%M %p}\n"
            f"Token No: {appointment.token_number}"
        )
        return self._send_text(str(patient.phone), msg)

    def send_appointment_reminder(self, patient: Patient, appointment: Appointment) -> bool:
        msg = (
            f"Reminder: Your appointment is tomorrow at {appointment.scheduled_at:%I:%M %p}. "
            f"Token No: {appointment.token_number}."
        )
        return self._send_text(str(patient.phone), msg)

    def send_prescription(self, patient: Patient, prescription: Prescription, pdf_bytes: bytes) -> bool:
        msg = (
            f"Dear {patient.full_name},\n"
            f"Your prescription is ready. Please collect your medicines as prescribed.\n"
            f"Follow-up: {prescription.follow_up_date or 'As advised'}"
        )
        return self._send_text(str(patient.phone), msg)

    def send_follow_up_reminder(self, patient: Patient, follow_up_date: str) -> bool:
        msg = (
            f"Dear {patient.full_name}, your follow-up visit is due on {follow_up_date}. "
            f"Please call to confirm your appointment."
        )
        return self._send_text(str(patient.phone), msg)
