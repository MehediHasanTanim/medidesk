# Clean Architecture Boundaries

## Layer Order (inner → outer)
```
domain  →  application  →  infrastructure  (implements domain)
                ↓
           interfaces  (REST API)
```

## What belongs where

### `domain/`
- Pure Python — zero Django/DRF imports
- Entities: dataclasses with behaviour methods (`appointment.confirm()`, `appointment.cancel()`)
- Value objects: immutable dataclasses (`Money`, `PhoneNumber`, `Dosage`, `Vitals`)
- Repository interfaces: ABCs in `domain/repositories/i_*.py`
- Service interfaces: ABCs in `domain/services/`

### `application/`
- Use cases only — orchestration, no business logic, no raw ORM
- Receives request DTO → opens UoW → calls domain methods → persists → returns response DTO
- Side effects (notifications, async tasks) happen **after** the `with self._uow:` block closes

### `infrastructure/`
- All Django ORM lives here — `infrastructure/orm/models/`
- Repositories implement domain interfaces — `infrastructure/repositories/django_*_repository.py`
- Each repo has a `_to_domain()` static method to convert ORM → domain entity
- `DjangoUnitOfWork` in `infrastructure/unit_of_work/django_unit_of_work.py`
- All migrations in `infrastructure/migrations/`; `app_label = "infrastructure"` on every model

### `interfaces/`
- DRF views call use cases — no business logic in views
- Serializers validate request data only
- Permission classes enforce RBAC before the view body runs
- All endpoints under `/api/v1/`

## Hard violations to avoid
- Any `from django.*` import inside `domain/` or `application/`
- ORM queryset in a use case or view (use repo methods instead)
- Business logic in a view (move to use case or domain entity)
- Direct `Model.objects.*` calls outside `infrastructure/repositories/`
