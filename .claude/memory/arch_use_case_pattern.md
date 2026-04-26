# Use Case Pattern

## Canonical skeleton
```python
class BookAppointmentUseCase:
    def __init__(self, uow: IUnitOfWork, notification_service: INotificationService) -> None:
        self._uow = uow
        self._notification = notification_service

    def execute(self, dto: BookAppointmentDTO) -> AppointmentResponseDTO:
        with self._uow:                        # starts atomic transaction
            patient = self._uow.patients.get_by_id(uuid.UUID(dto.patient_id))
            if not patient:
                raise ValueError("Patient not found")
            # … domain logic …
            saved = self._uow.appointments.save(appointment)
            self._uow.commit()                 # no-op in Django; commits at context exit

        # Side effects OUTSIDE the transaction
        try:
            self._notification.send_appointment_confirmation(patient, saved)
        except Exception as exc:
            logger.error("Notification failed: %s", exc)

        return AppointmentResponseDTO(...)
```

## Key rules
- Always `with self._uow:` — never call repo methods outside a UoW context
- `self._uow.commit()` is a no-op in Django (atomic commits at `__exit__`), but call it for explicitness
- Notifications and Celery tasks go **after** the `with` block — never inside the transaction
- Raise `ValueError` for domain rule violations (views catch and return 400/409)
- Use `uuid.UUID(str_id)` to convert string IDs from DTOs before passing to repos

## File location
`backend/application/use_cases/{entity}/{verb}_{entity}.py`
e.g. `backend/application/use_cases/appointment/book_appointment.py`

## DTO conventions
- Request: `{Action}{Entity}DTO` → `BookAppointmentDTO`
- Response: `{Entity}ResponseDTO` → `AppointmentResponseDTO`
- Both are dataclasses; string IDs (UUIDs as str), ISO datetime strings
- Located in `backend/application/dtos/{entity}_dto.py`

## Instantiation in views
Use cases are instantiated directly in view methods via the `Container`:
```python
from interfaces.api.container import Container
use_case = Container.book_appointment_use_case()
result = use_case.execute(dto)
```
