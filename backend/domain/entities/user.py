from dataclasses import dataclass, field
from enum import Enum
from typing import List
from uuid import UUID


class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    DOCTOR = "doctor"
    ASSISTANT_DOCTOR = "assistant_doctor"
    RECEPTIONIST = "receptionist"
    ASSISTANT = "assistant"


@dataclass
class User:
    id: UUID
    username: str
    full_name: str
    email: str
    role: UserRole
    chamber_ids: List[UUID] = field(default_factory=list)
    is_active: bool = True

    @property
    def is_admin(self) -> bool:
        return self.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)

    @property
    def is_doctor(self) -> bool:
        return self.role == UserRole.DOCTOR

    @property
    def can_prescribe(self) -> bool:
        return self.role in (UserRole.DOCTOR, UserRole.ASSISTANT_DOCTOR)

    @property
    def requires_prescription_approval(self) -> bool:
        return self.role == UserRole.ASSISTANT_DOCTOR


@dataclass
class Chamber:
    id: UUID
    name: str
    address: str
    phone: str
    is_active: bool = True
