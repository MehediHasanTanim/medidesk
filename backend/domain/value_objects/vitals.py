from dataclasses import dataclass
from decimal import Decimal
from typing import Optional


@dataclass(frozen=True)
class Vitals:
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    pulse: Optional[int] = None
    temperature: Optional[Decimal] = None   # Celsius
    weight: Optional[Decimal] = None        # kg
    height: Optional[Decimal] = None        # cm
    spo2: Optional[int] = None              # %

    @property
    def bmi(self) -> Optional[Decimal]:
        if self.weight and self.height and self.height > 0:
            h = self.height / Decimal("100")
            return round(self.weight / (h**2), 1)
        return None

    @property
    def bp_display(self) -> Optional[str]:
        if self.blood_pressure_systolic and self.blood_pressure_diastolic:
            return f"{self.blood_pressure_systolic}/{self.blood_pressure_diastolic} mmHg"
        return None
