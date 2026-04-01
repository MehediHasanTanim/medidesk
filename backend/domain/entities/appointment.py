from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID


class AppointmentType(str, Enum):
    NEW = "new"
    FOLLOW_UP = "follow_up"
    WALK_IN = "walk_in"


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_QUEUE = "in_queue"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


@dataclass
class Appointment:
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    scheduled_at: datetime
    appointment_type: AppointmentType
    status: AppointmentStatus
    chamber_id: Optional[UUID] = None
    token_number: Optional[int] = None
    notes: str = ""
    created_by_id: Optional[UUID] = None
    created_at: Optional[datetime] = None

    def confirm(self) -> None:
        if self.status != AppointmentStatus.SCHEDULED:
            raise ValueError("Only scheduled appointments can be confirmed")
        self.status = AppointmentStatus.CONFIRMED

    def cancel(self) -> None:
        if self.status in (AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED):
            raise ValueError(f"Cannot cancel a {self.status.value} appointment")
        self.status = AppointmentStatus.CANCELLED

    def mark_in_progress(self) -> None:
        self.status = AppointmentStatus.IN_PROGRESS

    def complete(self) -> None:
        self.status = AppointmentStatus.COMPLETED
