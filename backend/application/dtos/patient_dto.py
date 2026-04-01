from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class RegisterPatientDTO:
    full_name: str
    phone: str
    gender: str
    address: str
    date_of_birth: Optional[str] = None
    email: Optional[str] = None
    national_id: Optional[str] = None
    allergies: List[str] = field(default_factory=list)
    chronic_diseases: List[str] = field(default_factory=list)
    family_history: str = ""


@dataclass
class PatientResponseDTO:
    id: str
    patient_id: str
    full_name: str
    phone: str
    gender: str
    address: str
    age: Optional[int]
    email: Optional[str]
    allergies: List[str]
    chronic_diseases: List[str]
    family_history: str
