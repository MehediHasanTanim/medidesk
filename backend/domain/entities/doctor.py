from dataclasses import dataclass, field
from datetime import time
from decimal import Decimal
from typing import List, Optional
from uuid import UUID


@dataclass
class Speciality:
    id: UUID
    name: str
    description: str = ""
    is_active: bool = True


@dataclass
class DoctorProfile:
    id: UUID
    user_id: UUID
    speciality_id: UUID
    qualifications: str          # e.g. "MBBS, MD (Cardiology), FCPS"
    bio: str = ""
    consultation_fee: Optional[Decimal] = None
    experience_years: Optional[int] = None
    is_available: bool = True
    visit_days: List[str] = field(default_factory=list)   # ["Sat", "Sun", "Mon"]
    visit_time_start: Optional[time] = None
    visit_time_end: Optional[time] = None
