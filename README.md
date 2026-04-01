# MediDesk — Clinic Management System

A full-stack clinic management platform built for Bangladesh private consultancy practices. Manages patients, appointments, live queue, prescriptions, billing, and staff — all from a single web interface.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 5, Django REST Framework, SimpleJWT |
| Database | PostgreSQL 16 |
| Task Queue | Celery + Redis |
| Frontend | React 18, TypeScript, Vite |
| State | Zustand (auth) + TanStack Query (server) |
| Routing | React Router v6 |
| Containerisation | Docker + Docker Compose |

---

## Features

- **Authentication** — JWT login with role-embedded tokens, refresh flow, auto-logout on expiry
- **RBAC** — Six roles: `super_admin`, `admin`, `doctor`, `assistant_doctor`, `receptionist`, `assistant`
- **Patients** — Registration, search by name / phone / patient ID
- **Appointments** — Booking, scheduling, live token queue (auto-refreshes every 30 s)
- **Prescriptions** — Doctor-authored prescriptions with approval flow for assistant doctors
- **Billing** — Invoice creation and payment recording
- **Chambers** — Manage clinic branches and consultation rooms
- **Staff Management** — Create, edit, deactivate staff accounts with role assignment

---

## Project Structure

```
medidesk/
├── backend/                  # Django — Clean Architecture
│   ├── domain/               # Entities, value objects, repository interfaces
│   ├── application/          # Use cases, DTOs
│   ├── infrastructure/       # Django ORM models, repositories, migrations
│   ├── interfaces/           # REST API views, serializers, permissions
│   └── config/               # Settings (base / development / production)
├── frontend/                 # React + TypeScript
│   └── src/
│       ├── features/         # Auth, patients, appointments, users, chambers …
│       └── shared/           # AppShell, RoleGuard, apiClient, theme tokens
├── docker-compose.yml        # Development stack
├── docker-compose.prod.yml   # Production overrides
├── Plan/                     # Architecture docs, implementation plan
└── docs/                     # Sample data, additional documentation
```

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.13+ (for local backend dev)

### 1 — Clone & configure

```bash
git clone https://github.com/MehediHasanTanim/medidesk.git
cd medidesk
cp .env.example .env          # root — Docker Compose vars
cp backend/.env.example backend/.env   # backend — Django vars
# Edit both .env files with your values
```

### 2 — Run with Docker (recommended)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Django API | http://localhost:8005/api/v1/ |
| React frontend | http://localhost:5175 |

### 3 — Local development (without Docker)

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8005
```

**Frontend**

```bash
cd frontend
npm install
npm run dev          # starts on http://localhost:5175
```

---

## Create Users

Use the bundled script to create staff accounts directly:

```bash
cd backend

# Super Admin
python create_user.py --username sa --full-name "Super Admin" --role super_admin --password Admin1234! --email sa@clinic.com

# Doctor
python create_user.py --username dr_rahim --full-name "Dr. Rahim" --role doctor --password Doc1234!

# All roles: super_admin | admin | doctor | assistant_doctor | receptionist | assistant
```

Sample accounts for every role are documented in [`docs/sample_users/sample_users.md`](docs/sample_users/sample_users.md).

---

## API Overview

Base path: `/api/v1/`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/auth/login/` | Public |
| POST | `/auth/refresh/` | Public |
| GET / PATCH | `/auth/me/` | Authenticated |
| POST | `/auth/change-password/` | Authenticated |
| GET / POST | `/users/` | Admin+ |
| GET / PATCH / DELETE | `/users/<id>/` | Admin+ |
| GET / POST | `/chambers/` | GET all auth, POST admin+ |
| GET / POST | `/patients/` | Authenticated |
| GET | `/patients/search/` | Authenticated |
| GET / POST | `/appointments/` | Authenticated |
| GET | `/appointments/queue/` | Authenticated |
| GET / POST | `/prescriptions/` | Doctor+ |
| GET / POST | `/billing/invoices/` | Receptionist+ |

---

## Roles & Permissions

| Role | Description |
|---|---|
| `super_admin` | Full access to everything, Django superuser flag |
| `admin` | Full access, manage staff and chambers |
| `doctor` | Prescriptions, consultations, patient records |
| `assistant_doctor` | Prescriptions (require approval), consultations |
| `receptionist` | Appointments, billing, patient registration |
| `assistant` | Read-only patient & appointment access |

---

## Environment Variables

Copy `.env.example` and fill in:

| Variable | Description |
|---|---|
| `DB_NAME` | PostgreSQL database name |
| `DB_USER` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_HOST` | DB host (`db` in Docker, `localhost` locally) |
| `DB_PORT` | DB port (`5432` in Docker, `5433` if local PG conflicts) |
| `SECRET_KEY` | Django secret key |
| `CELERY_BROKER_URL` | Redis URL for Celery |

---

## License

Private — all rights reserved.
