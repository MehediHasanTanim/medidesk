# Repository Pattern

## Interface location
`backend/domain/repositories/i_{entity}_repository.py`

```python
from abc import ABC, abstractmethod
class IAppointmentRepository(ABC):
    @abstractmethod
    def get_by_id(self, appointment_id: uuid.UUID) -> Optional[Appointment]: ...
    @abstractmethod
    def save(self, appointment: Appointment) -> Appointment: ...
    @abstractmethod
    def has_conflict(self, doctor_id, scheduled_at, exclude_id=None, slot_minutes=15) -> bool: ...
```

## Implementation location
`backend/infrastructure/repositories/django_{entity}_repository.py`

Key conventions:
- `_to_domain(orm_obj) -> DomainEntity` — static method, always present
- All writes use `Model.objects.update_or_create()` or direct model save
- Never return ORM objects — always convert via `_to_domain()`
- UUIDs: domain uses `uuid.UUID`, ORM stores as `UUIDField` — conversion is automatic via Django

## Naming
| Concern | Name |
|---|---|
| Interface | `IAppointmentRepository` |
| Implementation | `DjangoAppointmentRepository` |
| Method | `.get_by_id()`, `.save()`, `.list_by_*()`, `.has_conflict()` |
