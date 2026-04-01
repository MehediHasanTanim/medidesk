from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID

from domain.entities.medicine import PrescriptionItem


class PrescriptionStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    APPROVED = "approved"


@dataclass
class Prescription:
    id: UUID
    consultation_id: UUID
    patient_id: UUID
    prescribed_by_id: UUID
    items: List[PrescriptionItem] = field(default_factory=list)
    status: PrescriptionStatus = PrescriptionStatus.DRAFT
    approved_by_id: Optional[UUID] = None
    follow_up_date: Optional[date] = None
    pdf_path: Optional[str] = None
    created_at: Optional[datetime] = None

    def approve(self, approver_id: UUID) -> None:
        if self.status != PrescriptionStatus.DRAFT:
            raise ValueError("Only draft prescriptions can be approved")
        self.approved_by_id = approver_id
        self.status = PrescriptionStatus.APPROVED

    def activate(self) -> None:
        self.status = PrescriptionStatus.ACTIVE
