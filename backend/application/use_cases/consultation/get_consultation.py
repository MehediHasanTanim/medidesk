import uuid
from typing import List, Optional

from domain.entities.consultation import Consultation
from domain.repositories.i_consultation_repository import IConsultationRepository


class GetConsultationUseCase:
    """Read-only access to consultations — by ID, by appointment, or by patient."""

    def __init__(self, repo: IConsultationRepository) -> None:
        self._repo = repo

    def by_id(self, consultation_id: uuid.UUID) -> Optional[Consultation]:
        return self._repo.get_by_id(consultation_id)

    def by_appointment(self, appointment_id: uuid.UUID) -> Optional[Consultation]:
        return self._repo.get_by_appointment(appointment_id)

    def by_patient(self, patient_id: uuid.UUID, limit: int = 20) -> List[Consultation]:
        return self._repo.get_by_patient(patient_id, limit=limit)
