from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from domain.value_objects.vitals import Vitals


@dataclass
class Consultation:
    id: UUID
    appointment_id: UUID
    patient_id: UUID
    doctor_id: UUID
    chief_complaints: str
    clinical_findings: str = ""
    diagnosis: str = ""
    notes: str = ""
    vitals: Optional[Vitals] = None
    is_draft: bool = True
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    def complete(self) -> None:
        if not self.diagnosis.strip():
            raise ValueError("Diagnosis is required to complete a consultation")
        self.is_draft = False
        self.completed_at = datetime.now()
