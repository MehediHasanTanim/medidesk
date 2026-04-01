from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from uuid import UUID

from domain.value_objects.money import Money


class PaymentMethod(str, Enum):
    CASH = "cash"
    BKASH = "bkash"
    NAGAD = "nagad"
    CARD = "card"


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    CANCELLED = "cancelled"


@dataclass
class InvoiceItem:
    description: str
    quantity: int
    unit_price: Money

    @property
    def total(self) -> Money:
        return Money(self.unit_price.amount * self.quantity, self.unit_price.currency)


@dataclass
class Invoice:
    id: UUID
    invoice_number: str
    patient_id: UUID
    consultation_id: Optional[UUID]
    items: List[InvoiceItem] = field(default_factory=list)
    discount_percent: Decimal = Decimal("0")
    status: InvoiceStatus = InvoiceStatus.DRAFT
    created_at: Optional[datetime] = None

    @property
    def subtotal(self) -> Money:
        total = Money(Decimal("0"))
        for item in self.items:
            total = total.add(item.total)
        return total

    @property
    def total_due(self) -> Money:
        return self.subtotal.apply_discount(self.discount_percent)


@dataclass
class Payment:
    id: UUID
    invoice_id: UUID
    amount: Money
    method: PaymentMethod
    transaction_ref: str = ""
    paid_at: Optional[datetime] = None
    recorded_by_id: Optional[UUID] = None
