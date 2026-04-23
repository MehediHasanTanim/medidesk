from dataclasses import dataclass, field
from typing import List, Optional


# ── Chamber Schedule DTO ──────────────────────────────────────────────────────

@dataclass
class ChamberScheduleDTO:
    chamber_id: str
    visit_days: List[str] = field(default_factory=list)
    visit_time_start: Optional[str] = None   # "HH:MM"
    visit_time_end: Optional[str] = None     # "HH:MM"


# ── Speciality DTOs ───────────────────────────────────────────────────────────

@dataclass
class SpecialityDTO:
    id: str
    name: str
    description: str
    is_active: bool
    doctor_count: int = 0


@dataclass
class CreateSpecialityDTO:
    name: str
    description: str = ""


@dataclass
class UpdateSpecialityDTO:
    speciality_id: str
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


# ── Doctor profile DTOs ───────────────────────────────────────────────────────

@dataclass
class DoctorProfileDTO:
    # Profile identity
    id: str
    # User fields
    user_id: str
    username: str
    full_name: str
    email: str
    role: str
    is_active: bool
    # Speciality
    speciality_id: str
    speciality_name: str
    # Profile fields
    qualifications: str
    bio: str
    consultation_fee: Optional[float]
    experience_years: Optional[int]
    is_available: bool
    visit_days: List[str]
    visit_time_start: Optional[str]   # "HH:MM"
    visit_time_end: Optional[str]     # "HH:MM"
    # Assigned chambers
    chamber_ids: List[str] = field(default_factory=list)
    supervisor_doctor_id: Optional[str] = None
    profile_complete: bool = True
    # Per-chamber visit schedules
    chamber_schedules: List[ChamberScheduleDTO] = field(default_factory=list)


@dataclass
class CreateDoctorProfileDTO:
    # User fields (new user will be created, unless existing_user_id is provided)
    username: str
    password: str
    full_name: str
    email: str
    role: str                          # "doctor" or "assistant_doctor"
    # Profile fields
    speciality_id: str
    qualifications: str
    existing_user_id: Optional[str] = None   # set when adding a profile to an existing user
    bio: str = ""
    consultation_fee: Optional[float] = None
    experience_years: Optional[int] = None
    is_available: bool = True
    visit_days: List[str] = field(default_factory=list)
    visit_time_start: Optional[str] = None
    visit_time_end: Optional[str] = None
    chamber_ids: List[str] = field(default_factory=list)
    supervisor_doctor_id: Optional[str] = None
    chamber_schedules: List[ChamberScheduleDTO] = field(default_factory=list)


@dataclass
class UpdateDoctorProfileDTO:
    profile_id: str
    # User fields (all optional)
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    # Profile fields (all optional)
    speciality_id: Optional[str] = None
    qualifications: Optional[str] = None
    bio: Optional[str] = None
    consultation_fee: Optional[float] = None
    experience_years: Optional[int] = None
    is_available: Optional[bool] = None
    visit_days: Optional[List[str]] = None
    visit_time_start: Optional[str] = None
    visit_time_end: Optional[str] = None
    chamber_ids: Optional[List[str]] = None
    supervisor_doctor_id: Optional[str] = None
    chamber_schedules: Optional[List[ChamberScheduleDTO]] = None
