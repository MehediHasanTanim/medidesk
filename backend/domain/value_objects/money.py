from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str = "BDT"

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError("Amount cannot be negative")

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("Currency mismatch")
        return Money(self.amount + other.amount, self.currency)

    def apply_discount(self, percent: Decimal) -> "Money":
        discount = self.amount * (percent / Decimal("100"))
        return Money(self.amount - discount, self.currency)

    def __str__(self) -> str:
        return f"{self.amount:.2f} {self.currency}"
