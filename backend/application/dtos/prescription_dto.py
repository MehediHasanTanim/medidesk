from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class PrescriptionItemDTO:
    medicine_id: str
    medicine_name: str
    morning: str
    afternoon: str
    evening: str
    duration_days: int
    route: str = "oral"
    instructions: str = ""


@dataclass
class CreatePrescriptionDTO:
    consultation_id: str
    patient_id: str
    prescribed_by_id: str
    items: List[PrescriptionItemDTO] = field(default_factory=list)
    follow_up_date: Optional[str] = None  # ISO date string "YYYY-MM-DD"
