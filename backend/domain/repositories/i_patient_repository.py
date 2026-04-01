from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from domain.entities.patient import Patient
from domain.value_objects.phone_number import PhoneNumber


class IPatientRepository(ABC):

    @abstractmethod
    def get_by_id(self, patient_id: UUID) -> Optional[Patient]: ...

    @abstractmethod
    def get_by_phone(self, phone: PhoneNumber) -> Optional[Patient]: ...

    @abstractmethod
    def get_by_patient_code(self, code: str) -> Optional[Patient]: ...

    @abstractmethod
    def save(self, patient: Patient) -> Patient: ...

    @abstractmethod
    def search(self, query: str, limit: int = 20, offset: int = 0) -> List[Patient]: ...

    @abstractmethod
    def list_all(self, limit: int = 50, offset: int = 0) -> List[Patient]: ...
