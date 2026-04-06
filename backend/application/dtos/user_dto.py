from dataclasses import dataclass, field
from typing import List, Optional
from uuid import UUID


@dataclass
class CreateUserDTO:
    username: str
    full_name: str
    email: str
    role: str
    password: str
    chamber_ids: List[str] = field(default_factory=list)


@dataclass
class UpdateUserDTO:
    user_id: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    chamber_ids: Optional[List[str]] = None


@dataclass
class ChangePasswordDTO:
    user_id: str
    old_password: str
    new_password: str


@dataclass
class UserResponseDTO:
    id: str
    username: str
    full_name: str
    email: str
    role: str
    chamber_ids: List[str]
    is_active: bool


@dataclass
class CreateChamberDTO:
    name: str
    address: str
    phone: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


@dataclass
class UpdateChamberDTO:
    chamber_id: str
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: Optional[bool] = None
