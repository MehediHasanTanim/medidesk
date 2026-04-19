from dataclasses import dataclass, field
from typing import List, Optional
from uuid import UUID

from domain.value_objects.dosage import Dosage


@dataclass
class GenericMedicine:
    id: UUID
    generic_name: str
    drug_class: str
    # Classification
    therapeutic_class: str = ""
    # Clinical information
    indications: str = ""
    dosage_info: str = ""         # Standard adult/child dosage guidelines
    administration: str = ""      # e.g. "Take on empty stomach"
    contraindications: List[str] = field(default_factory=list)
    side_effects: str = ""
    drug_interactions: str = ""
    storage: str = ""
    pregnancy_notes: str = ""     # Pregnancy / lactation details
    precautions: str = ""
    mode_of_action: str = ""      # Pharmacology / mechanism of action


@dataclass
class BrandMedicine:
    id: UUID
    generic_id: UUID
    brand_name: str
    manufacturer: str
    strength: str
    form: str
    mrp: Optional[float] = None   # Market retail price (BDT)
    product_code: str = ""        # Manufacturer's product code
    is_active: bool = True


@dataclass
class PrescriptionItem:
    medicine_id: UUID
    medicine_name: str
    dosage: Dosage
    route: str = "oral"
