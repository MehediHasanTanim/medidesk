from dataclasses import dataclass
from decimal import Decimal
from typing import Optional


@dataclass
class StartConsultationDTO:
    appointment_id: str
    patient_id: str
    doctor_id: str
    chief_complaints: str


@dataclass
class CompleteConsultationDTO:
    consultation_id: str
    diagnosis: str
    clinical_findings: str = ""
    notes: str = ""
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    pulse: Optional[int] = None
    temperature: Optional[Decimal] = None
    weight: Optional[Decimal] = None
    height: Optional[Decimal] = None
    spo2: Optional[int] = None
