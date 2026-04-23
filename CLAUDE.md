# MediDesk — CLAUDE.md

Clinic management system for Bangladesh. Django Clean Architecture backend + React/TypeScript frontend.

---

## Technology Stack

### Backend
| Package | Version | Purpose |
|---|---|---|
| Python | 3.13+ | Runtime |
| Django | ≥5.0, <6.0 | Web framework |
| djangorestframework | ≥3.15 | REST API |
| djangorestframework-simplejwt | ≥5.3 | JWT auth (access + refresh + blacklist) |
| django-cors-headers | ≥4.3 | CORS |
| drf-spectacular | ≥0.27 | OpenAPI 3 / Swagger docs |
| PostgreSQL | 16 (Alpine) | Primary database |
| psycopg2-binary | ≥2.9 | PostgreSQL driver |
| Celery | ≥5.3 | Async task queue |
| Redis | 7 (Alpine) | Celery broker + result backend |
| django-axes | ≥6.4 | Login rate limiting |
| WeasyPrint | ≥60.0 | PDF generation |
| Pillow | ≥10.0 | Image handling |
| Gunicorn | ≥22.0 | Production WSGI server |

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework |
| TypeScript | 5.2.2 | Type safety |
| Vite | 5.3.1 | Dev server + bundler |
| TanStack React Query | 5.40.0 | Server state / data fetching |
| Zustand | 4.5.2 | Client state (auth only) |
| React Router DOM | 6.23.1 | Client-side routing |
| Axios | 1.7.2 | HTTP client (JWT interceptors) |
| i18next / react-i18next | 23.x / 14.x | i18n |
| @react-google-maps/api | 2.20.8 | Chamber location picker |

### Infrastructure
- **Docker Compose** — dev stack (`docker-compose.yml`), prod overrides (`docker-compose.prod.yml`)
- **Backend port**: 8005 — **Frontend port**: 5175
- All timestamps stored UTC, displayed in `Asia/Dhaka`

---

## Project Folder Structure

```
MediDesk/
├── backend/
│   ├── domain/                   # Pure business logic — zero Django imports
│   │   ├── entities/             # Dataclass entities (Appointment, Patient, User, …)
│   │   ├── repositories/         # Abstract repo interfaces (IAppointmentRepository, …)
│   │   ├── services/             # Abstract service interfaces (INotificationService, …)
│   │   └── value_objects/        # Immutable VOs (Money, PhoneNumber, Dosage, Vitals)
│   │
│   ├── application/              # Use cases + DTOs — orchestration only, no business logic
│   │   ├── use_cases/            # Organised by entity: appointment/, consultation/, …
│   │   └── dtos/                 # Request/response dataclasses
│   │
│   ├── infrastructure/           # Django-specific implementations
│   │   ├── orm/models/           # ORM models (*Model suffix)
│   │   ├── repositories/         # Django repo implementations (django_*_repository.py)
│   │   ├── unit_of_work/         # DjangoUnitOfWork (atomic transaction wrapper)
│   │   └── migrations/           # Django migrations
│   │
│   ├── interfaces/               # REST API layer
│   │   ├── api/v1/               # All endpoints under /api/v1/
│   │   │   ├── urls.py           # Master URL config for v1
│   │   │   └── {feature}/        # views.py + serializers.py per feature
│   │   └── permissions.py        # RBAC classes and mixins
│   │
│   ├── config/
│   │   ├── settings/             # base.py, development.py, production.py
│   │   ├── urls.py               # Root URL router
│   │   └── celery.py
│   │
│   ├── create_user.py            # CLI script — create staff accounts
│   ├── seed_users.py             # Dev seeding script
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── App.tsx               # Root router + RoleGuard declarations
│       ├── features/             # Feature-sliced: one folder per domain feature
│       │   └── {feature}/
│       │       ├── pages/        # {Feature}Page.tsx
│       │       ├── api/          # {feature}Api.ts  (TanStack Query + Axios)
│       │       └── components/   # Feature-local components
│       └── shared/
│           ├── components/       # AppShell, RoleGuard, Toast, MapPicker
│           ├── lib/apiClient.ts  # Axios instance with JWT interceptors + refresh
│           ├── types/auth.ts     # UserRole union, ROLE_LABELS, ROLE_COLORS, ALL_ROLES
│           └── styles/theme.ts   # Design tokens (colors, font, radius, shadow)
│
├── docker-compose.yml
├── docker-compose.prod.yml
└── CLAUDE.md
```

---

## Naming Conventions

### Database Tables (`db_table` in Meta)
| Table | ORM Model |
|---|---|
| `users` | `UserModel` |
| `chambers` | `ChamberModel` |
| `patients` | `PatientModel` |
| `appointments` | `AppointmentModel` |
| `consultations` | `ConsultationModel` |
| `prescriptions` | `PrescriptionModel` |
| `prescription_items` | `PrescriptionItemModel` |
| `specialities` | `SpecialityModel` |
| `doctor_profiles` | `DoctorProfileModel` |
| `invoices` | `InvoiceModel` |
| `medicines` | `MedicineModel` |
| `test_orders` | `TestOrderModel` |
| `audit_logs` | `AuditLogModel` |

All ORM models live in `backend/infrastructure/orm/models/{entity}_model.py` and carry `app_label = "infrastructure"`.

### Backend Naming Patterns

| Concern | Pattern | Example |
|---|---|---|
| ORM model | `{Entity}Model` | `AppointmentModel` |
| Domain entity | `{Entity}` (dataclass) | `Appointment` |
| Repo interface | `I{Entity}Repository` | `IAppointmentRepository` |
| Repo implementation | `Django{Entity}Repository` | `DjangoAppointmentRepository` |
| ORM→domain converter | `_to_domain()` static method on repo | — |
| Use case | `{VerbEntity}UseCase` | `BookAppointmentUseCase` |
| Use case method | `execute(self, dto) -> ResponseDTO` | — |
| Request DTO | `{Action}{Entity}DTO` or `{Action}{Entity}Payload` | `BookAppointmentDTO` |
| Response DTO | `{Entity}ResponseDTO` | `AppointmentResponseDTO` |
| DTO files | `{entity}_dto.py` | `appointment_dto.py` |

### API URL Patterns
```
/api/v1/{resource}/                     # list / create
/api/v1/{resource}/{id}/                # retrieve / update / delete
/api/v1/{resource}/{id}/{action}/       # custom actions (POST)
/api/v1/{resource}/{id}/{sub-resource}/ # nested read
```
Examples: `/api/v1/consultations/{id}/complete/`, `/api/v1/appointments/{id}/check-in/`, `/api/v1/patients/{id}/history/`

### Frontend Naming Patterns
| Concern | Pattern | Example |
|---|---|---|
| Feature folder | camelCase | `testOrders/`, `patients/` |
| Page component | `{Feature}Page.tsx` | `TestOrdersPage.tsx` |
| API module | `{feature}Api.ts` | `testOrdersApi.ts` |
| Zustand store | `{feature}Store.ts` | `authStore.ts` |
| Zustand hook | `use{Feature}Store` | `useAuthStore` |
| Shared components | PascalCase `.tsx` | `AppShell.tsx`, `RoleGuard.tsx` |
| Custom hooks | `use{HookName}` | `useToast` |
| TypeScript types | PascalCase | `PatientSearchResponse`, `BookAppointmentPayload` |

---

## Architecture — Clean Architecture Layers

**Dependency rule**: outer layers depend on inner layers, never the reverse.

```
interfaces  →  application  →  domain
                    ↓
             infrastructure  (implements domain interfaces)
```

### Layer responsibilities

**`domain/`** — No framework imports. Entities are dataclasses with behaviour methods (`appointment.confirm()`, `appointment.cancel()`). Value objects are immutable dataclasses. Repository interfaces are ABCs.

**`application/`** — Use cases receive a request DTO, open a Unit of Work, call domain methods, persist via repositories, commit. Returns a response DTO. Side effects (notifications) happen *outside* the transaction. No raw ORM queries here.

**`infrastructure/`** — Django ORM models map to domain entities via each repo's `_to_domain()` static method. `DjangoUnitOfWork` wraps `django.db.transaction.atomic()` and exposes all repos as attributes. Commit is automatic at context manager exit if no exception.

**`interfaces/`** — DRF views call use cases directly (no business logic in views). Serializers handle request validation only. Permission classes enforce RBAC before the view body runs.

### Use case skeleton
```python
class BookAppointmentUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    def execute(self, dto: BookAppointmentDTO) -> AppointmentResponseDTO:
        with self._uow:                          # starts atomic transaction
            patient = self._uow.patients.get_by_id(dto.patient_id)
            appt = Appointment(...)
            saved = self._uow.appointments.save(appt)
        # notifications / async work after commit
        return AppointmentResponseDTO(...)
```

---

## RBAC — Roles & Permissions

### Roles (stored as `role` CharField on `UserModel`)
| Role | Description |
|---|---|
| `super_admin` | Full access; Django superuser flag set |
| `admin` | Full access; staff management |
| `doctor` | Consultations, prescriptions, test orders, patients |
| `assistant_doctor` | Same as doctor but prescriptions/test orders require approval |
| `receptionist` | Appointments, billing (full), patient registration |
| `assistant` | Appointments, billing (no update), patient registration |
| `trainee` | Read-only clinical observer — cannot create or modify anything |

`admin` and `super_admin` bypass all `ModulePermission` checks.

**receptionist vs assistant**: Assistant cannot update invoices (`billing.update`) and cannot change appointment status. All other access is identical.

### Permission classes (`interfaces/permissions.py`)
- `AdminOnly` — admin/super_admin only
- `RolePermission(["role1", "role2"])` — factory returning a class; admins always pass
- `ModulePermission("module", action=None)` — enforces `ROLE_PERMISSIONS` matrix; derives action from HTTP method unless overridden
- `ConsultationOwnershipMixin.check_consultation_scope()` — doctors/assistant_doctors can only write to their own consultations
- `ReceptionistChamberScopeMixin.check_chamber_scope()` — receptionists/assistants scoped to their assigned chambers

All 403 denials are logged at `WARNING` level via the `medidesk.rbac` logger.

### Module permission matrix summary
| Module | doctor | assistant_doctor | receptionist | assistant | trainee |
|---|---|---|---|---|---|
| appointments | view/create/update | view/create/update | view/create/update | view/create/update | view |
| consultations | view/create/update | view/create/update | view | view | view |
| prescriptions | view/create/update | view/create/update | — | — | view |
| medicines | view/create/update | view/create/update | view | view | view |
| test_orders | all | all | — | — | view |
| patients | view/create/update | view/update | view/create/update | view/create/update | view |
| billing | view | view | view/create/update | view/create | — |
| reports | view/create | view/create | — | — | — |

---

## Standing Constraints

### Hardcoded domain assumptions
- **Currency**: BDT (Bangladeshi Taka). Hardcoded in `Money` value object — `currency: str = "BDT"`. No multi-currency support.
- **Timezone**: `Asia/Dhaka` in both Django settings (`TIME_ZONE`) and Celery (`CELERY_TIMEZONE`). Timestamps stored UTC, displayed in BD local time.
- **API prefix**: all endpoints under `/api/v1/`. No versioning negotiation.

### Auth / JWT
- Tokens stored in `localStorage` (`access_token`, `refresh_token`).
- Axios interceptor auto-refreshes on 401 before retrying the original request.
- `canAccess(roles[])` helper on `useAuthStore` — used by `RoleGuard` and page-level UI visibility checks.

### Data model constraints
- Patient phone number duplicates are **allowed** (migration `0005`).
- `appointment.token_number` is nullable (assigned at check-in).
- Prescription lifecycle: `draft` → `active` (doctor approval) for assistant_doctor submissions.
- One consultation → at most one prescription (1-to-1 FK).

### Environment variables (backend)
```
DJANGO_SECRET_KEY       required
DJANGO_SETTINGS_MODULE  config.settings.development | config.settings.production
DB_NAME / DB_USER / DB_PASSWORD / DB_HOST / DB_PORT
CELERY_BROKER_URL       redis://redis:6379/0
CELERY_RESULT_BACKEND   redis://redis:6379/1
WHATSAPP_API_URL / WHATSAPP_API_TOKEN / WHATSAPP_FROM_NUMBER   (notifications)
EMAIL_HOST / EMAIL_PORT / EMAIL_HOST_USER / EMAIL_HOST_PASSWORD (email)
```

### Running locally (Docker)
```bash
# Start all services
docker compose up

# Backend: http://localhost:8005  (API + Swagger at /api/v1/schema/swagger-ui/)
# Frontend: http://localhost:5175

# Create a staff user
docker compose exec backend python create_user.py \
  --username admin --full-name "Admin User" --role super_admin --password Admin1234!
```

### Migrations
```bash
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
```

All migrations live in `backend/infrastructure/migrations/`. The `app_label` for all models is `"infrastructure"`.
