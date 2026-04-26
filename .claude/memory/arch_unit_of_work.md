# DjangoUnitOfWork

## How it works
File: `backend/infrastructure/unit_of_work/django_unit_of_work.py`

- `__enter__`: starts `transaction.atomic()`, initialises all repo instances
- `__exit__`: if exception → `transaction.set_rollback(True)`; always calls `atomic.__exit__`
- `commit()`: no-op — Django commits automatically at end of clean atomic block
- All repos are attributes: `uow.users`, `uow.patients`, `uow.appointments`, `uow.consultations`, `uow.prescriptions`, `uow.billing`, `uow.medicines`, `uow.audit_logs`, `uow.chambers`

## Adding a new repository
1. Create `domain/repositories/i_{entity}_repository.py` (ABC interface)
2. Create `infrastructure/repositories/django_{entity}_repository.py` (implementation)
3. Import and add to `DjangoUnitOfWork.__enter__` as `self.{entities} = Django{Entity}Repository()`
4. Add to `IUnitOfWork` ABC in `domain/repositories/i_unit_of_work.py`

## Doctor repository is NOT in UoW
`DjangoDoctorRepository` exists for read-only lookups but is not wired into UoW — doctors are managed through `UserModel`. Access it directly when needed outside a transaction.
