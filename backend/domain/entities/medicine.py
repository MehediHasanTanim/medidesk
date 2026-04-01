from dataclasses import dataclass, field
from typing import List
from uuid import UUID

from domain.value_objects.dosage import Dosage


@dataclass
class GenericMedicine:
    id: UUID
    generic_name: str
    drug_class: str
    contraindications: List[str] = field(default_factory=list)


@dataclass
class BrandMedicine:
    id: UUID
    generic_id: UUID
    brand_name: str
    manufacturer: str
    strength: str
    form: str
    is_active: bool = True


@dataclass
class PrescriptionItem:
    medicine_id: UUID
    medicine_name: str
    dosage: Dosage
    route: str = "oral"
