from dataclasses import dataclass


@dataclass(frozen=True)
class Dosage:
    morning: str
    afternoon: str
    evening: str
    duration_days: int
    instructions: str = ""

    def __str__(self) -> str:
        return f"{self.morning}+{self.afternoon}+{self.evening} × {self.duration_days} days"
