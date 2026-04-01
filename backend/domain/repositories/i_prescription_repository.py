from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from domain.entities.prescription import Prescription


class IPrescriptionRepository(ABC):

    @abstractmethod
    def get_by_id(self, prescription_id: UUID) -> Optional[Prescription]: ...

    @abstractmethod
    def get_by_consultation(self, consultation_id: UUID) -> Optional[Prescription]: ...

    @abstractmethod
    def get_by_patient(self, patient_id: UUID, limit: int = 20) -> List[Prescription]: ...

    @abstractmethod
    def save(self, prescription: Prescription) -> Prescription: ...
