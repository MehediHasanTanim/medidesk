from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class RegisterPatientDTO:
    full_name: str
    phone: str
    gender: str
    address: str
    date_of_birth: Optional[str] = None
    age_years: Optional[int] = None
    email: Optional[str] = None
    national_id: Optional[str] = None
    allergies: List[str] = field(default_factory=list)
    chronic_diseases: List[str] = field(default_factory=list)
    family_history: str = ""


@dataclass
class UpdatePatientDTO:
    patient_id: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    age_years: Optional[int] = None
    email: Optional[str] = None
    national_id: Optional[str] = None
    allergies: Optional[List[str]] = None
    chronic_diseases: Optional[List[str]] = None
    family_history: Optional[str] = None


@dataclass
class PatientResponseDTO:
    id: str
    patient_id: str
    full_name: str
    phone: str
    gender: str
    address: str
    age: Optional[int]
    date_of_birth: Optional[str]
    email: Optional[str]
    national_id: Optional[str]
    allergies: List[str]
    chronic_diseases: List[str]
    family_history: str
