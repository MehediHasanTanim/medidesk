import re
from dataclasses import dataclass


@dataclass(frozen=True)
class PhoneNumber:
    value: str

    def __post_init__(self) -> None:
        cleaned = re.sub(r"\D", "", self.value)
        if not re.match(r"^(880|0)1[3-9]\d{8}$", cleaned):
            raise ValueError(f"Invalid Bangladesh phone number: {self.value!r}")
        if cleaned.startswith("0"):
            cleaned = "880" + cleaned[1:]
        object.__setattr__(self, "value", cleaned)

    def __str__(self) -> str:
        return self.value
