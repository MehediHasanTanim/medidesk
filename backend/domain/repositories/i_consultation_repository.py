from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from domain.entities.consultation import Consultation


class IConsultationRepository(ABC):

    @abstractmethod
    def get_by_id(self, consultation_id: UUID) -> Optional[Consultation]: ...

    @abstractmethod
    def get_by_appointment(self, appointment_id: UUID) -> Optional[Consultation]: ...

    @abstractmethod
    def get_by_patient(self, patient_id: UUID, limit: int = 20) -> List[Consultation]: ...

    @abstractmethod
    def save(self, consultation: Consultation) -> Consultation: ...
