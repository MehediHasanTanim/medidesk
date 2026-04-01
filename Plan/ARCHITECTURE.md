# MediDesk Django Project Structure

## Directory Layout

```
backend/
├── manage.py                          # Django CLI entry point
├── requirements.txt
├── entrypoint.sh                      # Docker startup script
├── .env
│
├── config/                            # Project configuration
│   ├── settings/
│   │   ├── base.py                    # Shared settings
│   │   ├── development.py             # Dev overrides (PostgreSQL, DEBUG=True)
│   │   └── production.py             # Prod overrides (Gunicorn, HTTPS)
│   ├── urls.py                        # Root URL router
│   ├── wsgi.py                        # Production WSGI server
│   └── asgi.py                        # Async server (WebSockets)
│
├── domain/                            # Layer 1 — Pure business logic
│   ├── entities/                      # Core business objects
│   │   ├── user.py
│   │   ├── patient.py
│   │   ├── appointment.py
│   │   ├── consultation.py
│   │   ├── prescription.py
│   │   ├── billing.py
│   │   └── medicine.py
│   ├── repositories/                  # Abstract interfaces only (no DB code)
│   │   ├── i_unit_of_work.py
│   │   ├── i_patient_repository.py
│   │   ├── i_appointment_repository.py
│   │   └── ...
│   ├── services/                      # Abstract service interfaces
│   │   ├── i_notification_service.py
│   │   └── i_document_service.py
│   └── value_objects/                 # Immutable domain types
│       ├── phone_number.py            # Bangladesh phone validation
│       ├── money.py                   # BDT currency
│       ├── dosage.py                  # morning+afternoon+evening × N days
│       └── vitals.py                  # BP, pulse, temp, weight...
│
├── application/                       # Layer 2 — Use cases (orchestration)
│   ├── dtos/                          # Data Transfer Objects (input/output shapes)
│   │   ├── patient_dto.py
│   │   ├── appointment_dto.py
│   │   ├── consultation_dto.py
│   │   ├── prescription_dto.py
│   │   └── billing_dto.py
│   └── use_cases/                     # One class = one business operation
│       ├── patient/
│       │   └── register_patient.py
│       ├── appointment/
│       │   └── book_appointment.py
│       ├── consultation/
│       │   ├── start_consultation.py
│       │   └── complete_consultation.py
│       ├── prescription/
│       │   └── create_prescription.py
│       └── billing/
│           ├── create_invoice.py
│           └── record_payment.py
│
├── infrastructure/                    # Layer 3 — Django ORM + external services
│   ├── apps.py                        # Django app config
│   ├── models.py                      # Wildcard import → Django model discovery
│   ├── migrations/                    # Auto-generated DB migrations
│   ├── orm/
│   │   └── models/                    # Django ORM models (DB tables)
│   │       ├── user_model.py          # UserModel, ChamberModel
│   │       ├── patient_model.py
│   │       ├── appointment_model.py
│   │       ├── consultation_model.py
│   │       ├── prescription_model.py
│   │       ├── billing_model.py
│   │       ├── medicine_model.py
│   │       ├── audit_log_model.py
│   │       └── test_order_model.py
│   ├── repositories/                  # Concrete DB implementations
│   │   ├── django_patient_repository.py
│   │   ├── django_appointment_repository.py
│   │   └── ...
│   ├── unit_of_work/
│   │   └── django_unit_of_work.py     # Wraps all repos in one DB transaction
│   └── services/
│       ├── email_service.py
│       ├── whatsapp_service.py
│       └── notification_composite.py
│
└── interfaces/                        # Layer 4 — HTTP API (DRF views)
    ├── permissions.py                 # RolePermission (doctor/receptionist/admin)
    └── api/
        ├── container.py               # Dependency injection wiring
        └── v1/
            ├── urls.py                # All API routes
            ├── auth/views.py          # /auth/login, /auth/me, /auth/logout
            ├── patients/              # /patients/, /patients/search/
            ├── appointments/          # /appointments/, /appointments/queue/
            ├── consultations/         # /consultations/
            ├── prescriptions/         # /prescriptions/
            ├── billing/               # /invoices/, /payments/
            └── medicines/             # /medicines/search/
```

---

## The 4-Layer Architecture (Clean Architecture)

```
Request
   │
   ▼
┌─────────────────────────────────┐
│  interfaces/   (Layer 4)        │  DRF Views, Serializers, URL routing
│  HTTP in → HTTP out             │  Knows about: Application layer only
└──────────────┬──────────────────┘
               │ calls use cases with DTOs
               ▼
┌─────────────────────────────────┐
│  application/  (Layer 3)        │  Use cases orchestrate the flow
│  "Do this business operation"   │  Knows about: Domain layer only
└──────────────┬──────────────────┘
               │ calls domain entities + repo interfaces
               ▼
┌─────────────────────────────────┐
│  domain/       (Layer 2)        │  Entities, business rules, pure Python
│  The "what" of the system       │  Knows about: nothing external
└──────────────┬──────────────────┘
               │ implemented by
               ▼
┌─────────────────────────────────┐
│  infrastructure/ (Layer 1)      │  Django ORM, PostgreSQL, Redis, APIs
│  The "how" of persistence       │  Knows about: everything above
└─────────────────────────────────┘
```

**The rule:** each layer only depends on the layer above it (toward domain). The `domain/` layer has zero imports from Django.

---

## Key Design Patterns

### Repository Pattern
- `domain/repositories/i_patient_repository.py` — abstract interface (ABC)
- `infrastructure/repositories/django_patient_repository.py` — concrete Django ORM implementation
- Use cases only talk to the interface, never to Django ORM directly

### Unit of Work
```python
with DjangoUnitOfWork() as uow:
    patient = uow.patients.get_by_phone(phone)
    uow.appointments.save(appointment)
    uow.commit()   # all or nothing
```
Wraps `django.db.transaction.atomic()` — if anything fails, the whole operation rolls back.

### Dependency Injection
- `interfaces/api/container.py` wires use cases with their concrete dependencies
- Views call `Container.register_patient()` instead of `new`-ing dependencies directly

---

## How a Request Flows

```
POST /api/v1/patients/
        │
        ▼
PatientRegistrationView          (interfaces/api/v1/patients/views.py)
  → validates with serializer
  → builds RegisterPatientDTO
        │
        ▼
RegisterPatientUseCase           (application/use_cases/patient/register_patient.py)
  → checks duplicate phone
  → creates Patient entity
  → generates MED-XXXXX patient ID
        │
        ▼
DjangoPatientRepository.save()   (infrastructure/repositories/django_patient_repository.py)
  → maps entity → PatientModel
  → PatientModel.objects.create()
        │
        ▼
PostgreSQL patients table
```

---

## Why One Django App (`infrastructure`)

Most Django projects have many apps (`patients`, `appointments`, etc.). MediDesk uses **one app** called `infrastructure` that owns all ORM models. This keeps Django's ORM isolated — the `domain/` and `application/` layers are plain Python with no Django imports, making them testable without a database.
