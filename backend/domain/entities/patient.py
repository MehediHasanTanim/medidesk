from dataclasses import dataclass, field
from datetime import date
from typing import List, Optional
from uuid import UUID

from domain.value_objects.phone_number import PhoneNumber


@dataclass
class Patient:
    id: UUID
    patient_id: str
    full_name: str
    phone: PhoneNumber
    gender: str
    address: str
    date_of_birth: Optional[date] = None
    email: Optional[str] = None
    national_id: Optional[str] = None
    allergies: List[str] = field(default_factory=list)
    chronic_diseases: List[str] = field(default_factory=list)
    family_history: str = ""
    is_active: bool = True
    created_at: Optional[date] = None

    age_years: Optional[int] = None  # fallback when date_of_birth is unknown

    @property
    def age(self) -> Optional[int]:
        if self.date_of_birth:
            today = date.today()
            return today.year - self.date_of_birth.year - (
                (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
            )
        return self.age_years
