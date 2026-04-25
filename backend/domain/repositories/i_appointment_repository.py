from abc import ABC, abstractmethod
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from domain.entities.appointment import Appointment


class IAppointmentRepository(ABC):

    @abstractmethod
    def get_by_id(self, appointment_id: UUID) -> Optional[Appointment]: ...

    @abstractmethod
    def save(self, appointment: Appointment) -> Appointment: ...

    @abstractmethod
    def get_by_date(self, target_date: date, chamber_id: Optional[UUID] = None) -> List[Appointment]: ...

    @abstractmethod
    def get_queue(self, target_date: date, chamber_id: Optional[UUID] = None) -> List[Appointment]: ...

    @abstractmethod
    def get_next_token(self, target_date: date, chamber_id: Optional[UUID] = None) -> int: ...

    @abstractmethod
    def get_by_patient(self, patient_id: UUID, limit: int = 20) -> List[Appointment]: ...

    @abstractmethod
    def has_conflict(
        self,
        doctor_id: UUID,
        scheduled_at: datetime,
        exclude_appointment_id: Optional[UUID] = None,
        slot_minutes: int = 15,
    ) -> bool:
        """Return True if an active appointment for doctor_id falls within
        slot_minutes of scheduled_at (exclusive of cancelled/no_show)."""
        ...
