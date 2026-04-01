from abc import ABC, abstractmethod

from domain.entities.appointment import Appointment
from domain.entities.patient import Patient
from domain.entities.prescription import Prescription


class INotificationService(ABC):

    @abstractmethod
    def send_appointment_confirmation(self, patient: Patient, appointment: Appointment) -> bool: ...

    @abstractmethod
    def send_appointment_reminder(self, patient: Patient, appointment: Appointment) -> bool: ...

    @abstractmethod
    def send_prescription(self, patient: Patient, prescription: Prescription, pdf_bytes: bytes) -> bool: ...

    @abstractmethod
    def send_follow_up_reminder(self, patient: Patient, follow_up_date: str) -> bool: ...
