from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Optional


@dataclass
class InvoiceItemDTO:
    description: str
    quantity: int
    unit_price: Decimal


@dataclass
class CreateInvoiceDTO:
    patient_id: str
    items: List[InvoiceItemDTO] = field(default_factory=list)
    consultation_id: Optional[str] = None
    discount_percent: Decimal = Decimal("0")
    created_by_id: Optional[str] = None


@dataclass
class RecordPaymentDTO:
    invoice_id: str
    amount: Decimal
    method: str  # cash | bkash | nagad | card
    transaction_ref: str = ""
    recorded_by_id: Optional[str] = None
