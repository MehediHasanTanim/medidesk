from dataclasses import dataclass
from typing import Optional


@dataclass
class BookAppointmentDTO:
    patient_id: str
    doctor_id: str
    scheduled_at: str
    appointment_type: str
    chamber_id: Optional[str] = None
    notes: str = ""
    created_by_id: Optional[str] = None


@dataclass
class UpdateAppointmentDTO:
    appointment_id: str
    doctor_id: Optional[str] = None
    scheduled_at: Optional[str] = None
    appointment_type: Optional[str] = None
    chamber_id: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class AppointmentResponseDTO:
    id: str
    patient_id: str
    patient_name: str
    patient_phone: str
    doctor_id: str
    chamber_id: Optional[str]
    scheduled_at: str
    appointment_type: str
    status: str
    token_number: Optional[int]
    notes: str = ""
