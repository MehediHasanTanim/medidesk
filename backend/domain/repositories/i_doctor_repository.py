from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from domain.entities.doctor import DoctorProfile, Speciality


class IDoctorRepository(ABC):

    # ── Specialities ──────────────────────────────────────────────────────────

    @abstractmethod
    def get_speciality_by_id(self, speciality_id: UUID) -> Optional[Speciality]:
        ...

    @abstractmethod
    def get_speciality_by_name(self, name: str) -> Optional[Speciality]:
        ...

    @abstractmethod
    def list_specialities(self, active_only: bool = True) -> List[Speciality]:
        ...

    @abstractmethod
    def save_speciality(self, speciality: Speciality) -> Speciality:
        ...

    @abstractmethod
    def delete_speciality(self, speciality_id: UUID) -> None:
        ...

    @abstractmethod
    def speciality_has_doctors(self, speciality_id: UUID) -> bool:
        ...

    # ── Doctor profiles ───────────────────────────────────────────────────────

    @abstractmethod
    def get_profile_by_id(self, profile_id: UUID) -> Optional[DoctorProfile]:
        ...

    @abstractmethod
    def get_profile_by_user_id(self, user_id: UUID) -> Optional[DoctorProfile]:
        ...

    @abstractmethod
    def list_profiles(
        self,
        speciality_id: Optional[UUID] = None,
        is_available: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> List[DoctorProfile]:
        ...

    @abstractmethod
    def save_profile(self, profile: DoctorProfile) -> DoctorProfile:
        ...
