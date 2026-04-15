from dataclasses import dataclass


@dataclass(frozen=True)
class Dosage:
    morning: str
    afternoon: str
    evening: str
    duration_days: int
    instructions: str = ""

    def __str__(self) -> str:
        m = self.morning or "0"
        a = self.afternoon or "0"
        e = self.evening or "0"
        return f"{m}+{a}+{e} × {self.duration_days} days"
