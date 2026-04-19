from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class TestOrder:
    id: UUID
    consultation_id: UUID
    patient_id: UUID
    test_name: str
    lab_name: str = ""
    notes: str = ""
    ordered_by_id: Optional[UUID] = None
    ordered_by_name: str = ""
    ordered_at: Optional[datetime] = None
    is_completed: bool = False
    completed_at: Optional[datetime] = None
