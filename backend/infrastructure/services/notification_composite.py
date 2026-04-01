import logging
from typing import List

from domain.entities.appointment import Appointment
from domain.entities.patient import Patient
from domain.entities.prescription import Prescription
from domain.services.i_notification_service import INotificationService

logger = logging.getLogger(__name__)


class CompositeNotificationService(INotificationService):
    """
    Fan-out to all registered channels.
    Returns True if at least one channel succeeds.
    Adding a new channel (e.g. SMS) requires zero changes here.
    """

    def __init__(self, services: List[INotificationService]) -> None:
        self._services = services

    def send_appointment_confirmation(self, patient: Patient, appointment: Appointment) -> bool:
        return self._fan_out("send_appointment_confirmation", patient, appointment)

    def send_appointment_reminder(self, patient: Patient, appointment: Appointment) -> bool:
        return self._fan_out("send_appointment_reminder", patient, appointment)

    def send_prescription(self, patient: Patient, prescription: Prescription, pdf_bytes: bytes) -> bool:
        return self._fan_out("send_prescription", patient, prescription, pdf_bytes)

    def send_follow_up_reminder(self, patient: Patient, follow_up_date: str) -> bool:
        return self._fan_out("send_follow_up_reminder", patient, follow_up_date)

    def _fan_out(self, method: str, *args) -> bool:
        results = []
        for svc in self._services:
            try:
                result = getattr(svc, method)(*args)
                results.append(result)
            except Exception as exc:
                logger.error("[%s] %s failed: %s", svc.__class__.__name__, method, exc)
                results.append(False)
        return any(results)
