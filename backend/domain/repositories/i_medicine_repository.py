from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from domain.entities.medicine import BrandMedicine, GenericMedicine


class IMedicineRepository(ABC):

    # ── Generic medicines ─────────────────────────────────────────────────────

    @abstractmethod
    def list_generics(self, search: str = "", drug_class: str = "", limit: int = 100, offset: int = 0) -> List[GenericMedicine]: ...

    @abstractmethod
    def count_generics(self, search: str = "", drug_class: str = "") -> int: ...

    @abstractmethod
    def get_generic_by_id(self, generic_id: UUID) -> Optional[GenericMedicine]: ...

    @abstractmethod
    def create_generic(self, generic: GenericMedicine) -> GenericMedicine: ...

    @abstractmethod
    def update_generic(self, generic: GenericMedicine) -> GenericMedicine: ...

    @abstractmethod
    def delete_generic(self, generic_id: UUID) -> bool: ...

    @abstractmethod
    def get_generics_by_class(self, drug_class: str) -> List[GenericMedicine]: ...

    # ── Brand medicines ───────────────────────────────────────────────────────

    @abstractmethod
    def list_brands(self, search: str = "", generic_id: Optional[UUID] = None,
                    form: str = "", active_only: bool = True,
                    limit: int = 100, offset: int = 0) -> List[BrandMedicine]: ...

    @abstractmethod
    def count_brands(self, search: str = "", generic_id: Optional[UUID] = None,
                     form: str = "", active_only: bool = True) -> int: ...

    @abstractmethod
    def search_brands(self, query: str, limit: int = 10) -> List[BrandMedicine]: ...

    @abstractmethod
    def get_brand_by_id(self, medicine_id: UUID) -> Optional[BrandMedicine]: ...

    @abstractmethod
    def create_brand(self, brand: BrandMedicine) -> BrandMedicine: ...

    @abstractmethod
    def update_brand(self, brand: BrandMedicine) -> BrandMedicine: ...

    @abstractmethod
    def deactivate_brand(self, medicine_id: UUID) -> bool: ...

    @abstractmethod
    def brand_count_for_generic(self, generic_id: UUID) -> int: ...
