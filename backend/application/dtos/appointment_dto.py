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
class AppointmentResponseDTO:
    id: str
    patient_name: str
    patient_phone: str
    scheduled_at: str
    appointment_type: str
    status: str
    token_number: Optional[int]
