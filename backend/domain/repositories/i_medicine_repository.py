from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from domain.entities.medicine import BrandMedicine, GenericMedicine


class IMedicineRepository(ABC):

    @abstractmethod
    def search_brands(self, query: str, limit: int = 10) -> List[BrandMedicine]: ...

    @abstractmethod
    def get_brand_by_id(self, medicine_id: UUID) -> Optional[BrandMedicine]: ...

    @abstractmethod
    def get_generics_by_class(self, drug_class: str) -> List[GenericMedicine]: ...
