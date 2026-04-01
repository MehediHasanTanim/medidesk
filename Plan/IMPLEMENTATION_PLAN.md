# MediDesk — Personal Medical Consultancy Management System
## Production Implementation Plan

> Bangladesh clinic-focused | Django + DRF + React + TypeScript + PostgreSQL
> Architecture: Clean Architecture | Pattern: Repository + Unit of Work | Auth: JWT + RBAC

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [Project Structure](#3-project-structure)
4. [Domain Layer — Entities & Value Objects](#4-domain-layer)
5. [Infrastructure Layer — ORM Models & Repositories](#5-infrastructure-layer)
6. [Unit of Work Pattern](#6-unit-of-work-pattern)
7. [Application Layer — Use Cases & DTOs](#7-application-layer)
8. [Interface Layer — DRF Views & Serializers](#8-interface-layer)
9. [Authentication & RBAC](#9-authentication--rbac)
10. [Key API Endpoints](#10-key-api-endpoints)
11. [Notification System Design](#11-notification-system-design)
12. [Frontend Architecture](#12-frontend-architecture)
13. [End-to-End Flows](#13-end-to-end-flows)
14. [Search & Filtering](#14-search--filtering)
15. [Document Management](#15-document-management)
16. [Database Indexing Strategy](#16-database-indexing-strategy)
17. [Backup Strategy](#17-backup-strategy)
18. [Localization](#18-localization)
19. [MVP Phased Roadmap](#19-mvp-phased-roadmap)
20. [Non-Functional Requirements](#20-non-functional-requirements)

---

## 1. System Overview

**MediDesk** is a clinic management system for a personal consultancy practice in Bangladesh. It manages the complete patient lifecycle: registration → appointment → consultation → prescription → billing → notification.

### Core Modules
| Module | Scope |
|--------|-------|
| User & Role Management | Doctor, Assistant Doctor, Receptionist with RBAC |
| Patient Management | Registration, profile, timeline, medical history |
| Appointment & Queue | Time-slot booking, walk-ins, token queue system |
| Consultation | Vitals, findings, diagnosis, notes |
| Prescription | Digital Rx, drug DB (BD generic+brand), PDF/WhatsApp |
| Test & Reports | Lab orders, PDF/image upload, historical view |
| Billing & Payments | Fees, discounts, bKash/Nagad/Cash, invoices |
| Notifications | WhatsApp (mandatory) + Email |
| Analytics | Revenue, patient volume, clinical insights |
| Document Management | Per-patient file storage |
| Multi-Chamber | Multiple clinic locations, separate schedules |

---

## 2. Architecture Principles

```
┌──────────────────────────────────────────────────────┐
│                   Interface Layer                     │
│         DRF Views / Serializers / URL Routing         │
├──────────────────────────────────────────────────────┤
│                  Application Layer                    │
│        Use Cases / Services / DTOs / Interfaces       │
│         (depends ONLY on domain abstractions)         │
├──────────────────────────────────────────────────────┤
│                    Domain Layer                       │
│    Entities / Value Objects / Business Rules          │
│         (pure Python — zero Django/ORM imports)       │
├──────────────────────────────────────────────────────┤
│                Infrastructure Layer                   │
│    Django ORM Models / Repositories / External APIs   │
│         WhatsApp / Email / Payment / Storage          │
└──────────────────────────────────────────────────────┘
```

### ORM Boundary Rules (CRITICAL)
- Django ORM **only** in `infrastructure/`
- Domain entities are **plain Python dataclasses/classes**
- Application layer accesses data only through **repository interfaces**
- All multi-step writes wrapped in **Unit of Work**
- No `Model.objects.filter()` calls in views, use cases, or domain

### SOLID Application
- **S** — Each use case does one thing
- **O** — Notification service is open for extension (new channels)
- **L** — All repository implementations are substitutable
- **I** — `IPatientRepository`, `IAppointmentRepository` are narrow interfaces
- **D** — Use cases depend on interfaces, not concrete repos

---

## 3. Project Structure

```
medidesk/
├── manage.py
├── requirements.txt
├── .env.example
├── docker-compose.yml
├── Dockerfile
│
├── config/                          # Django project config
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   └── wsgi.py
│
├── domain/                          # LAYER 1: Pure Python — NO Django imports
│   ├── __init__.py
│   ├── entities/
│   │   ├── user.py
│   │   ├── patient.py
│   │   ├── appointment.py
│   │   ├── consultation.py
│   │   ├── prescription.py
│   │   ├── medicine.py
│   │   ├── test_order.py
│   │   ├── billing.py
│   │   └── audit_log.py
│   ├── value_objects/
│   │   ├── phone_number.py
│   │   ├── patient_id.py
│   │   ├── dosage.py
│   │   ├── money.py
│   │   └── vitals.py
│   ├── repositories/                # Abstract interfaces only
│   │   ├── i_patient_repository.py
│   │   ├── i_appointment_repository.py
│   │   ├── i_consultation_repository.py
│   │   ├── i_prescription_repository.py
│   │   ├── i_billing_repository.py
│   │   ├── i_medicine_repository.py
│   │   └── i_unit_of_work.py
│   └── services/                    # Domain service interfaces
│       ├── i_notification_service.py
│       └── i_document_service.py
│
├── application/                     # LAYER 2: Use Cases — depends only on domain
│   ├── __init__.py
│   ├── dtos/
│   │   ├── patient_dto.py
│   │   ├── appointment_dto.py
│   │   ├── consultation_dto.py
│   │   ├── prescription_dto.py
│   │   └── billing_dto.py
│   └── use_cases/
│       ├── patient/
│       │   ├── register_patient.py
│       │   ├── get_patient_profile.py
│       │   └── search_patients.py
│       ├── appointment/
│       │   ├── book_appointment.py
│       │   ├── reschedule_appointment.py
│       │   └── manage_queue.py
│       ├── consultation/
│       │   ├── start_consultation.py
│       │   ├── record_vitals.py
│       │   └── complete_consultation.py
│       ├── prescription/
│       │   ├── create_prescription.py
│       │   └── share_prescription.py
│       └── billing/
│           ├── create_invoice.py
│           └── record_payment.py
│
├── infrastructure/                  # LAYER 3: Django ORM + External Services
│   ├── __init__.py
│   ├── orm/
│   │   ├── models/
│   │   │   ├── user_model.py
│   │   │   ├── patient_model.py
│   │   │   ├── appointment_model.py
│   │   │   ├── consultation_model.py
│   │   │   ├── prescription_model.py
│   │   │   ├── medicine_model.py
│   │   │   ├── test_order_model.py
│   │   │   ├── billing_model.py
│   │   │   └── audit_log_model.py
│   │   └── mappers/
│   │       ├── patient_mapper.py
│   │       └── appointment_mapper.py
│   ├── repositories/
│   │   ├── django_patient_repository.py
│   │   ├── django_appointment_repository.py
│   │   ├── django_consultation_repository.py
│   │   ├── django_prescription_repository.py
│   │   └── django_billing_repository.py
│   ├── unit_of_work/
│   │   └── django_unit_of_work.py
│   ├── services/
│   │   ├── whatsapp_service.py        # Twilio / Meta WhatsApp API
│   │   ├── email_service.py           # Django email backend
│   │   ├── pdf_service.py             # WeasyPrint / ReportLab
│   │   └── storage_service.py        # Django FileSystemStorage
│   └── migrations/
│
├── interfaces/                      # LAYER 4: DRF API
│   ├── __init__.py
│   ├── api/
│   │   ├── v1/
│   │   │   ├── urls.py
│   │   │   ├── auth/
│   │   │   │   ├── views.py
│   │   │   │   └── serializers.py
│   │   │   ├── patients/
│   │   │   │   ├── views.py
│   │   │   │   └── serializers.py
│   │   │   ├── appointments/
│   │   │   │   ├── views.py
│   │   │   │   └── serializers.py
│   │   │   ├── consultations/
│   │   │   │   ├── views.py
│   │   │   │   └── serializers.py
│   │   │   ├── prescriptions/
│   │   │   │   ├── views.py
│   │   │   │   └── serializers.py
│   │   │   ├── billing/
│   │   │   │   ├── views.py
│   │   │   │   └── serializers.py
│   │   │   └── reports/
│   │   │       ├── views.py
│   │   │       └── serializers.py
│   │   └── container.py             # Dependency injection container
│   └── permissions.py              # DRF permission classes
│
└── frontend/                        # React + TypeScript
    ├── src/
    │   ├── app/
    │   ├── features/
    │   ├── shared/
    │   └── i18n/
    └── package.json
```

---

## 4. Domain Layer

### 4.1 Value Objects

```python
# domain/value_objects/phone_number.py
from dataclasses import dataclass
import re

@dataclass(frozen=True)
class PhoneNumber:
    value: str

    def __post_init__(self):
        cleaned = re.sub(r'\D', '', self.value)
        if not re.match(r'^(880|0)1[3-9]\d{8}$', cleaned):
            raise ValueError(f"Invalid BD phone number: {self.value}")
        object.__setattr__(self, 'value', cleaned)

    def __str__(self) -> str:
        return self.value


# domain/value_objects/money.py
from dataclasses import dataclass
from decimal import Decimal

@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str = "BDT"

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Amount cannot be negative")

    def add(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError("Currency mismatch")
        return Money(self.amount + other.amount, self.currency)

    def apply_discount(self, percent: Decimal) -> 'Money':
        discount = self.amount * (percent / Decimal('100'))
        return Money(self.amount - discount, self.currency)


# domain/value_objects/vitals.py
from dataclasses import dataclass
from typing import Optional
from decimal import Decimal

@dataclass(frozen=True)
class Vitals:
    blood_pressure_systolic: Optional[int] = None   # mmHg
    blood_pressure_diastolic: Optional[int] = None  # mmHg
    pulse: Optional[int] = None                      # bpm
    temperature: Optional[Decimal] = None            # Celsius
    weight: Optional[Decimal] = None                 # kg
    height: Optional[Decimal] = None                 # cm
    spo2: Optional[int] = None                       # %

    @property
    def bmi(self) -> Optional[Decimal]:
        if self.weight and self.height and self.height > 0:
            height_m = self.height / Decimal('100')
            return round(self.weight / (height_m ** 2), 1)
        return None


# domain/value_objects/dosage.py
from dataclasses import dataclass

@dataclass(frozen=True)
class Dosage:
    morning: str    # "1", "0", "1/2"
    afternoon: str
    evening: str
    duration_days: int
    instructions: str = ""

    def __str__(self) -> str:
        return f"{self.morning}+{self.afternoon}+{self.evening} × {self.duration_days} days"
```

### 4.2 Domain Entities

```python
# domain/entities/patient.py
from dataclasses import dataclass, field
from datetime import date
from typing import Optional, List
from uuid import UUID
from domain.value_objects.phone_number import PhoneNumber

@dataclass
class Patient:
    id: UUID
    patient_id: str          # e.g., "MED-00001" — auto-generated
    full_name: str
    phone: PhoneNumber
    date_of_birth: Optional[date]
    gender: str              # "M" | "F" | "O"
    address: str
    email: Optional[str] = None
    national_id: Optional[str] = None
    allergies: List[str] = field(default_factory=list)
    chronic_diseases: List[str] = field(default_factory=list)
    family_history: str = ""
    is_active: bool = True
    created_at: Optional[date] = None

    @property
    def age(self) -> Optional[int]:
        if not self.date_of_birth:
            return None
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )


# domain/entities/appointment.py
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID
from enum import Enum

class AppointmentType(str, Enum):
    NEW = "new"
    FOLLOW_UP = "follow_up"
    WALK_IN = "walk_in"

class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_QUEUE = "in_queue"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

@dataclass
class Appointment:
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    chamber_id: Optional[UUID]
    scheduled_at: datetime
    appointment_type: AppointmentType
    status: AppointmentStatus
    token_number: Optional[int] = None
    notes: str = ""
    created_by_id: Optional[UUID] = None
    created_at: Optional[datetime] = None

    def confirm(self) -> None:
        if self.status != AppointmentStatus.SCHEDULED:
            raise ValueError("Only scheduled appointments can be confirmed")
        self.status = AppointmentStatus.CONFIRMED

    def cancel(self) -> None:
        if self.status in (AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED):
            raise ValueError(f"Cannot cancel a {self.status} appointment")
        self.status = AppointmentStatus.CANCELLED


# domain/entities/consultation.py
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from domain.value_objects.vitals import Vitals

@dataclass
class Consultation:
    id: UUID
    appointment_id: UUID
    patient_id: UUID
    doctor_id: UUID
    chief_complaints: str
    clinical_findings: str
    diagnosis: str
    notes: str
    vitals: Optional[Vitals] = None
    is_draft: bool = True
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    def complete(self) -> None:
        if not self.diagnosis:
            raise ValueError("Diagnosis is required to complete consultation")
        self.is_draft = False
        self.completed_at = datetime.now()


# domain/entities/prescription.py
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from domain.entities.medicine import PrescriptionItem

class PrescriptionStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    APPROVED = "approved"   # for assistant-drafted prescriptions

@dataclass
class Prescription:
    id: UUID
    consultation_id: UUID
    patient_id: UUID
    prescribed_by_id: UUID
    approved_by_id: Optional[UUID]  # required if drafted by assistant
    items: List[PrescriptionItem] = field(default_factory=list)
    status: PrescriptionStatus = PrescriptionStatus.DRAFT
    follow_up_date: Optional[datetime] = None
    pdf_path: Optional[str] = None
    created_at: Optional[datetime] = None

    def approve(self, approver_id: UUID) -> None:
        if self.status != PrescriptionStatus.DRAFT:
            raise ValueError("Only draft prescriptions can be approved")
        self.approved_by_id = approver_id
        self.status = PrescriptionStatus.APPROVED

    def activate(self) -> None:
        self.status = PrescriptionStatus.ACTIVE


# domain/entities/medicine.py
from dataclasses import dataclass
from typing import Optional, List
from uuid import UUID
from domain.value_objects.dosage import Dosage

@dataclass
class GenericMedicine:
    id: UUID
    generic_name: str
    drug_class: str
    contraindications: List[str]

@dataclass
class BrandMedicine:
    id: UUID
    generic_id: UUID
    brand_name: str
    manufacturer: str
    strength: str          # e.g., "500mg", "10mg/5ml"
    form: str              # "tablet", "syrup", "injection"
    is_active: bool = True

@dataclass
class PrescriptionItem:
    medicine_id: UUID
    medicine_name: str    # denormalized for historical accuracy
    dosage: Dosage
    route: str = "oral"   # oral, topical, injection


# domain/entities/billing.py
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum
from decimal import Decimal
from domain.value_objects.money import Money

class PaymentMethod(str, Enum):
    CASH = "cash"
    BKASH = "bkash"
    NAGAD = "nagad"
    CARD = "card"

class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    CANCELLED = "cancelled"

@dataclass
class InvoiceItem:
    description: str
    quantity: int
    unit_price: Money

    @property
    def total(self) -> Money:
        return Money(self.unit_price.amount * self.quantity)

@dataclass
class Invoice:
    id: UUID
    invoice_number: str
    patient_id: UUID
    consultation_id: Optional[UUID]
    items: List[InvoiceItem] = field(default_factory=list)
    discount_percent: Decimal = Decimal('0')
    status: InvoiceStatus = InvoiceStatus.DRAFT
    created_at: Optional[datetime] = None

    @property
    def subtotal(self) -> Money:
        total = Money(Decimal('0'))
        for item in self.items:
            total = total.add(item.total)
        return total

    @property
    def total_due(self) -> Money:
        return self.subtotal.apply_discount(self.discount_percent)


# domain/entities/user.py
from dataclasses import dataclass
from typing import Optional
from uuid import UUID
from enum import Enum

class UserRole(str, Enum):
    DOCTOR = "doctor"
    ASSISTANT_DOCTOR = "assistant_doctor"
    RECEPTIONIST = "receptionist"
    ASSISTANT = "assistant"

@dataclass
class User:
    id: UUID
    username: str
    full_name: str
    email: str
    role: UserRole
    chamber_ids: list
    is_active: bool = True

    @property
    def is_doctor(self) -> bool:
        return self.role == UserRole.DOCTOR

    @property
    def can_prescribe(self) -> bool:
        return self.role in (UserRole.DOCTOR, UserRole.ASSISTANT_DOCTOR)

    @property
    def requires_prescription_approval(self) -> bool:
        return self.role == UserRole.ASSISTANT_DOCTOR
```

### 4.3 Repository Interfaces (Abstractions)

```python
# domain/repositories/i_patient_repository.py
from abc import ABC, abstractmethod
from typing import Optional, List
from uuid import UUID
from domain.entities.patient import Patient
from domain.value_objects.phone_number import PhoneNumber

class IPatientRepository(ABC):

    @abstractmethod
    def get_by_id(self, patient_id: UUID) -> Optional[Patient]: ...

    @abstractmethod
    def get_by_phone(self, phone: PhoneNumber) -> Optional[Patient]: ...

    @abstractmethod
    def get_by_patient_code(self, code: str) -> Optional[Patient]: ...

    @abstractmethod
    def save(self, patient: Patient) -> Patient: ...

    @abstractmethod
    def search(self, query: str, limit: int = 20, offset: int = 0) -> List[Patient]: ...

    @abstractmethod
    def list_all(self, limit: int = 50, offset: int = 0) -> List[Patient]: ...


# domain/repositories/i_appointment_repository.py
from abc import ABC, abstractmethod
from typing import Optional, List
from uuid import UUID
from datetime import date
from domain.entities.appointment import Appointment, AppointmentStatus

class IAppointmentRepository(ABC):

    @abstractmethod
    def get_by_id(self, appointment_id: UUID) -> Optional[Appointment]: ...

    @abstractmethod
    def save(self, appointment: Appointment) -> Appointment: ...

    @abstractmethod
    def get_by_date(self, target_date: date, chamber_id: Optional[UUID] = None) -> List[Appointment]: ...

    @abstractmethod
    def get_queue(self, target_date: date, chamber_id: Optional[UUID] = None) -> List[Appointment]: ...

    @abstractmethod
    def get_next_token(self, target_date: date, chamber_id: Optional[UUID] = None) -> int: ...

    @abstractmethod
    def get_by_patient(self, patient_id: UUID, limit: int = 20) -> List[Appointment]: ...


# domain/repositories/i_unit_of_work.py
from abc import ABC, abstractmethod
from domain.repositories.i_patient_repository import IPatientRepository
from domain.repositories.i_appointment_repository import IAppointmentRepository
from domain.repositories.i_consultation_repository import IConsultationRepository
from domain.repositories.i_prescription_repository import IPrescriptionRepository
from domain.repositories.i_billing_repository import IBillingRepository

class IUnitOfWork(ABC):
    patients: IPatientRepository
    appointments: IAppointmentRepository
    consultations: IConsultationRepository
    prescriptions: IPrescriptionRepository
    billing: IBillingRepository

    @abstractmethod
    def __enter__(self) -> 'IUnitOfWork': ...

    @abstractmethod
    def __exit__(self, exc_type, exc_val, exc_tb): ...

    @abstractmethod
    def commit(self) -> None: ...

    @abstractmethod
    def rollback(self) -> None: ...


# domain/services/i_notification_service.py
from abc import ABC, abstractmethod
from domain.entities.patient import Patient
from domain.entities.appointment import Appointment
from domain.entities.prescription import Prescription

class INotificationService(ABC):

    @abstractmethod
    def send_appointment_confirmation(self, patient: Patient, appointment: Appointment) -> bool: ...

    @abstractmethod
    def send_appointment_reminder(self, patient: Patient, appointment: Appointment) -> bool: ...

    @abstractmethod
    def send_prescription(self, patient: Patient, prescription: Prescription, pdf_bytes: bytes) -> bool: ...

    @abstractmethod
    def send_follow_up_reminder(self, patient: Patient, follow_up_date: str) -> bool: ...
```

---

## 5. Infrastructure Layer

### 5.1 Django ORM Models

```python
# infrastructure/orm/models/patient_model.py
import uuid
from django.db import models

class PatientModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient_id = models.CharField(max_length=20, unique=True, db_index=True)
    full_name = models.CharField(max_length=255, db_index=True)
    phone = models.CharField(max_length=20, unique=True, db_index=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=[('M','Male'),('F','Female'),('O','Other')])
    address = models.TextField()
    email = models.EmailField(null=True, blank=True)
    national_id = models.CharField(max_length=20, null=True, blank=True)
    allergies = models.JSONField(default=list)
    chronic_diseases = models.JSONField(default=list)
    family_history = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'patients'
        indexes = [
            models.Index(fields=['full_name']),
            models.Index(fields=['phone']),
            models.Index(fields=['patient_id']),
            models.Index(fields=['created_at']),
        ]


# infrastructure/orm/models/user_model.py
import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models

class UserModel(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=30, choices=[
        ('doctor', 'Doctor'),
        ('assistant_doctor', 'Assistant Doctor'),
        ('receptionist', 'Receptionist'),
        ('assistant', 'Assistant'),
    ], db_index=True)
    full_name = models.CharField(max_length=255)
    chambers = models.ManyToManyField('ChamberModel', blank=True, related_name='staff')

    class Meta:
        db_table = 'users'


class ChamberModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'chambers'


# infrastructure/orm/models/appointment_model.py
import uuid
from django.db import models

class AppointmentModel(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'), ('confirmed', 'Confirmed'),
        ('in_queue', 'In Queue'), ('in_progress', 'In Progress'),
        ('completed', 'Completed'), ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]
    TYPE_CHOICES = [
        ('new', 'New'), ('follow_up', 'Follow Up'), ('walk_in', 'Walk In'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey('PatientModel', on_delete=models.PROTECT,
                                related_name='appointments', db_index=True)
    doctor = models.ForeignKey('UserModel', on_delete=models.PROTECT,
                               related_name='appointments', db_index=True)
    chamber = models.ForeignKey('ChamberModel', on_delete=models.SET_NULL,
                                null=True, blank=True)
    scheduled_at = models.DateTimeField(db_index=True)
    appointment_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled',
                              db_index=True)
    token_number = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey('UserModel', on_delete=models.SET_NULL,
                                   null=True, related_name='created_appointments')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'appointments'
        indexes = [
            models.Index(fields=['scheduled_at', 'status']),
            models.Index(fields=['patient', 'scheduled_at']),
            models.Index(fields=['doctor', 'scheduled_at']),
            models.Index(fields=['chamber', 'scheduled_at']),
        ]


# infrastructure/orm/models/consultation_model.py
import uuid
from django.db import models

class ConsultationModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.OneToOneField('AppointmentModel', on_delete=models.PROTECT,
                                       related_name='consultation')
    patient = models.ForeignKey('PatientModel', on_delete=models.PROTECT,
                                related_name='consultations', db_index=True)
    doctor = models.ForeignKey('UserModel', on_delete=models.PROTECT,
                               related_name='consultations')
    chief_complaints = models.TextField()
    clinical_findings = models.TextField(blank=True)
    diagnosis = models.TextField()
    notes = models.TextField(blank=True)
    # Vitals (denormalized for query efficiency)
    bp_systolic = models.PositiveSmallIntegerField(null=True, blank=True)
    bp_diastolic = models.PositiveSmallIntegerField(null=True, blank=True)
    pulse = models.PositiveSmallIntegerField(null=True, blank=True)
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    spo2 = models.PositiveSmallIntegerField(null=True, blank=True)
    is_draft = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'consultations'
        indexes = [
            models.Index(fields=['patient', 'created_at']),
            models.Index(fields=['diagnosis']),
        ]


# infrastructure/orm/models/prescription_model.py
import uuid
from django.db import models

class PrescriptionModel(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'), ('active', 'Active'), ('approved', 'Approved'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.OneToOneField('ConsultationModel', on_delete=models.PROTECT,
                                         related_name='prescription')
    patient = models.ForeignKey('PatientModel', on_delete=models.PROTECT,
                                related_name='prescriptions', db_index=True)
    prescribed_by = models.ForeignKey('UserModel', on_delete=models.PROTECT,
                                      related_name='authored_prescriptions')
    approved_by = models.ForeignKey('UserModel', on_delete=models.SET_NULL,
                                    null=True, blank=True,
                                    related_name='approved_prescriptions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    follow_up_date = models.DateField(null=True, blank=True)
    pdf_path = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'prescriptions'


class PrescriptionItemModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription = models.ForeignKey(PrescriptionModel, on_delete=models.CASCADE,
                                     related_name='items')
    medicine = models.ForeignKey('BrandMedicineModel', on_delete=models.PROTECT)
    medicine_name = models.CharField(max_length=255)  # snapshot at time of prescribing
    morning = models.CharField(max_length=10)
    afternoon = models.CharField(max_length=10)
    evening = models.CharField(max_length=10)
    duration_days = models.PositiveSmallIntegerField()
    route = models.CharField(max_length=20, default='oral')
    instructions = models.TextField(blank=True)

    class Meta:
        db_table = 'prescription_items'


# infrastructure/orm/models/medicine_model.py
import uuid
from django.db import models

class GenericMedicineModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    generic_name = models.CharField(max_length=255, unique=True, db_index=True)
    drug_class = models.CharField(max_length=100, db_index=True)
    contraindications = models.JSONField(default=list)

    class Meta:
        db_table = 'generic_medicines'


class BrandMedicineModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    generic = models.ForeignKey(GenericMedicineModel, on_delete=models.PROTECT,
                                related_name='brands')
    brand_name = models.CharField(max_length=255, db_index=True)
    manufacturer = models.CharField(max_length=255)
    strength = models.CharField(max_length=50)
    form = models.CharField(max_length=50)   # tablet, syrup, injection, capsule
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = 'brand_medicines'
        indexes = [
            models.Index(fields=['brand_name', 'is_active']),
            models.Index(fields=['generic', 'is_active']),
        ]


# infrastructure/orm/models/billing_model.py
import uuid
from django.db import models
from decimal import Decimal

class InvoiceModel(models.Model):
    STATUS_CHOICES = [
        ('draft','Draft'), ('issued','Issued'), ('paid','Paid'),
        ('partially_paid','Partially Paid'), ('cancelled','Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=30, unique=True, db_index=True)
    patient = models.ForeignKey('PatientModel', on_delete=models.PROTECT,
                                related_name='invoices', db_index=True)
    consultation = models.ForeignKey('ConsultationModel', on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name='invoices')
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft',
                              db_index=True)
    created_by = models.ForeignKey('UserModel', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'invoices'
        indexes = [
            models.Index(fields=['created_at', 'status']),
            models.Index(fields=['patient', 'created_at']),
        ]


class InvoiceItemModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(InvoiceModel, on_delete=models.CASCADE,
                                related_name='items')
    description = models.CharField(max_length=255)
    quantity = models.PositiveSmallIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'invoice_items'


class PaymentModel(models.Model):
    METHOD_CHOICES = [
        ('cash','Cash'), ('bkash','bKash'),
        ('nagad','Nagad'), ('card','Card'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(InvoiceModel, on_delete=models.PROTECT,
                                related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    transaction_ref = models.CharField(max_length=100, blank=True)
    paid_at = models.DateTimeField(auto_now_add=True, db_index=True)
    recorded_by = models.ForeignKey('UserModel', on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = 'payments'


# infrastructure/orm/models/audit_log_model.py
import uuid
from django.db import models

class AuditLogModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('UserModel', on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50, db_index=True)   # CREATE, UPDATE, DELETE, VIEW
    resource_type = models.CharField(max_length=50, db_index=True)
    resource_id = models.CharField(max_length=36, db_index=True)
    payload = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_logs'
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]


# infrastructure/orm/models/test_order_model.py
import uuid
from django.db import models

class TestOrderModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey('ConsultationModel', on_delete=models.PROTECT,
                                     related_name='test_orders')
    patient = models.ForeignKey('PatientModel', on_delete=models.PROTECT,
                                related_name='test_orders', db_index=True)
    test_name = models.CharField(max_length=255)
    lab_name = models.CharField(max_length=255, blank=True)
    ordered_at = models.DateTimeField(auto_now_add=True)
    is_completed = models.BooleanField(default=False)

    class Meta:
        db_table = 'test_orders'


class ReportDocumentModel(models.Model):
    CATEGORY_CHOICES = [
        ('blood_test','Blood Test'), ('imaging','Imaging'),
        ('biopsy','Biopsy'), ('other','Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey('PatientModel', on_delete=models.PROTECT,
                                related_name='reports', db_index=True)
    test_order = models.ForeignKey(TestOrderModel, on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name='reports')
    consultation = models.ForeignKey('ConsultationModel', on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name='reports')
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, db_index=True)
    file = models.FileField(upload_to='reports/%Y/%m/%d/')
    original_filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey('UserModel', on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True, db_index=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'report_documents'
        indexes = [
            models.Index(fields=['patient', 'uploaded_at']),
            models.Index(fields=['category']),
        ]
```

### 5.2 ORM to Domain Mappers

```python
# infrastructure/orm/mappers/patient_mapper.py
from domain.entities.patient import Patient
from domain.value_objects.phone_number import PhoneNumber
from infrastructure.orm.models.patient_model import PatientModel

class PatientMapper:

    @staticmethod
    def to_domain(model: PatientModel) -> Patient:
        return Patient(
            id=model.id,
            patient_id=model.patient_id,
            full_name=model.full_name,
            phone=PhoneNumber(model.phone),
            date_of_birth=model.date_of_birth,
            gender=model.gender,
            address=model.address,
            email=model.email,
            national_id=model.national_id,
            allergies=model.allergies or [],
            chronic_diseases=model.chronic_diseases or [],
            family_history=model.family_history,
            is_active=model.is_active,
            created_at=model.created_at.date() if model.created_at else None,
        )

    @staticmethod
    def to_model(entity: Patient) -> PatientModel:
        return PatientModel(
            id=entity.id,
            patient_id=entity.patient_id,
            full_name=entity.full_name,
            phone=str(entity.phone),
            date_of_birth=entity.date_of_birth,
            gender=entity.gender,
            address=entity.address,
            email=entity.email,
            national_id=entity.national_id,
            allergies=entity.allergies,
            chronic_diseases=entity.chronic_diseases,
            family_history=entity.family_history,
            is_active=entity.is_active,
        )
```

### 5.3 Repository Implementations

```python
# infrastructure/repositories/django_patient_repository.py
from typing import Optional, List
from uuid import UUID
from django.db.models import Q
from domain.entities.patient import Patient
from domain.repositories.i_patient_repository import IPatientRepository
from domain.value_objects.phone_number import PhoneNumber
from infrastructure.orm.models.patient_model import PatientModel
from infrastructure.orm.mappers.patient_mapper import PatientMapper

class DjangoPatientRepository(IPatientRepository):

    def get_by_id(self, patient_id: UUID) -> Optional[Patient]:
        try:
            model = PatientModel.objects.get(id=patient_id)
            return PatientMapper.to_domain(model)
        except PatientModel.DoesNotExist:
            return None

    def get_by_phone(self, phone: PhoneNumber) -> Optional[Patient]:
        try:
            model = PatientModel.objects.get(phone=str(phone))
            return PatientMapper.to_domain(model)
        except PatientModel.DoesNotExist:
            return None

    def get_by_patient_code(self, code: str) -> Optional[Patient]:
        try:
            model = PatientModel.objects.get(patient_id=code)
            return PatientMapper.to_domain(model)
        except PatientModel.DoesNotExist:
            return None

    def save(self, patient: Patient) -> Patient:
        model = PatientMapper.to_model(patient)
        model.save()
        return PatientMapper.to_domain(model)

    def search(self, query: str, limit: int = 20, offset: int = 0) -> List[Patient]:
        qs = PatientModel.objects.filter(
            Q(full_name__icontains=query) |
            Q(phone__icontains=query) |
            Q(patient_id__icontains=query),
            is_active=True
        ).order_by('full_name')[offset:offset + limit]
        return [PatientMapper.to_domain(m) for m in qs]

    def list_all(self, limit: int = 50, offset: int = 0) -> List[Patient]:
        qs = PatientModel.objects.filter(is_active=True).order_by('-created_at')[offset:offset+limit]
        return [PatientMapper.to_domain(m) for m in qs]


# infrastructure/repositories/django_appointment_repository.py
from typing import Optional, List
from uuid import UUID
from datetime import date
from domain.entities.appointment import Appointment, AppointmentStatus
from domain.repositories.i_appointment_repository import IAppointmentRepository
from infrastructure.orm.models.appointment_model import AppointmentModel

class DjangoAppointmentRepository(IAppointmentRepository):

    def get_by_id(self, appointment_id: UUID) -> Optional[Appointment]:
        try:
            model = AppointmentModel.objects.select_related(
                'patient', 'doctor', 'chamber'
            ).get(id=appointment_id)
            return self._to_domain(model)
        except AppointmentModel.DoesNotExist:
            return None

    def save(self, appointment: Appointment) -> Appointment:
        AppointmentModel.objects.update_or_create(
            id=appointment.id,
            defaults={
                'patient_id': appointment.patient_id,
                'doctor_id': appointment.doctor_id,
                'chamber_id': appointment.chamber_id,
                'scheduled_at': appointment.scheduled_at,
                'appointment_type': appointment.appointment_type.value,
                'status': appointment.status.value,
                'token_number': appointment.token_number,
                'notes': appointment.notes,
                'created_by_id': appointment.created_by_id,
            }
        )
        return appointment

    def get_queue(self, target_date: date, chamber_id: Optional[UUID] = None) -> List[Appointment]:
        qs = AppointmentModel.objects.filter(
            scheduled_at__date=target_date,
            status__in=['confirmed', 'in_queue', 'in_progress']
        ).order_by('token_number')
        if chamber_id:
            qs = qs.filter(chamber_id=chamber_id)
        return [self._to_domain(m) for m in qs]

    def get_next_token(self, target_date: date, chamber_id: Optional[UUID] = None) -> int:
        qs = AppointmentModel.objects.filter(
            scheduled_at__date=target_date,
            token_number__isnull=False
        )
        if chamber_id:
            qs = qs.filter(chamber_id=chamber_id)
        max_token = qs.aggregate(max_token=models.Max('token_number'))['max_token']
        return (max_token or 0) + 1

    def get_by_date(self, target_date: date, chamber_id: Optional[UUID] = None) -> List[Appointment]:
        qs = AppointmentModel.objects.filter(
            scheduled_at__date=target_date
        ).select_related('patient').order_by('scheduled_at')
        if chamber_id:
            qs = qs.filter(chamber_id=chamber_id)
        return [self._to_domain(m) for m in qs]

    def get_by_patient(self, patient_id: UUID, limit: int = 20) -> List[Appointment]:
        qs = AppointmentModel.objects.filter(
            patient_id=patient_id
        ).order_by('-scheduled_at')[:limit]
        return [self._to_domain(m) for m in qs]

    def _to_domain(self, model: AppointmentModel) -> Appointment:
        from domain.entities.appointment import AppointmentType
        return Appointment(
            id=model.id,
            patient_id=model.patient_id,
            doctor_id=model.doctor_id,
            chamber_id=model.chamber_id,
            scheduled_at=model.scheduled_at,
            appointment_type=AppointmentType(model.appointment_type),
            status=AppointmentStatus(model.status),
            token_number=model.token_number,
            notes=model.notes,
            created_by_id=model.created_by_id,
            created_at=model.created_at,
        )
```

---

## 6. Unit of Work Pattern

```python
# infrastructure/unit_of_work/django_unit_of_work.py
from django.db import transaction
from domain.repositories.i_unit_of_work import IUnitOfWork
from infrastructure.repositories.django_patient_repository import DjangoPatientRepository
from infrastructure.repositories.django_appointment_repository import DjangoAppointmentRepository
from infrastructure.repositories.django_consultation_repository import DjangoConsultationRepository
from infrastructure.repositories.django_prescription_repository import DjangoPresfcriptionRepository
from infrastructure.repositories.django_billing_repository import DjangoBillingRepository

class DjangoUnitOfWork(IUnitOfWork):

    def __enter__(self) -> 'DjangoUnitOfWork':
        self._atomic = transaction.atomic()
        self._atomic.__enter__()
        self.patients = DjangoPatientRepository()
        self.appointments = DjangoAppointmentRepository()
        self.consultations = DjangoConsultationRepository()
        self.prescriptions = DjangoPrescriptionRepository()
        self.billing = DjangoBillingRepository()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.rollback()
        else:
            self.commit()
        self._atomic.__exit__(exc_type, exc_val, exc_tb)

    def commit(self) -> None:
        # Django atomic block commits on __exit__ unless savepoint rollback
        pass

    def rollback(self) -> None:
        transaction.set_rollback(True)
```

**Usage pattern in all Use Cases:**
```python
with uow:
    patient = uow.patients.get_by_phone(phone)
    appointment = Appointment(...)
    uow.appointments.save(appointment)
    uow.commit()
```

---

## 7. Application Layer

### 7.1 DTOs

```python
# application/dtos/patient_dto.py
from dataclasses import dataclass
from typing import Optional, List

@dataclass
class RegisterPatientDTO:
    full_name: str
    phone: str
    gender: str
    address: str
    date_of_birth: Optional[str] = None  # ISO date string
    email: Optional[str] = None
    national_id: Optional[str] = None
    allergies: List[str] = None
    chronic_diseases: List[str] = None

@dataclass
class PatientResponseDTO:
    id: str
    patient_id: str
    full_name: str
    phone: str
    gender: str
    age: Optional[int]
    address: str
    email: Optional[str]
    allergies: List[str]
    chronic_diseases: List[str]


# application/dtos/appointment_dto.py
from dataclasses import dataclass
from typing import Optional

@dataclass
class BookAppointmentDTO:
    patient_id: str
    doctor_id: str
    scheduled_at: str       # ISO datetime
    appointment_type: str   # new | follow_up | walk_in
    chamber_id: Optional[str] = None
    notes: str = ""
    created_by_id: Optional[str] = None

@dataclass
class AppointmentResponseDTO:
    id: str
    patient_name: str
    patient_phone: str
    scheduled_at: str
    appointment_type: str
    status: str
    token_number: Optional[int]
```

### 7.2 Use Cases

```python
# application/use_cases/patient/register_patient.py
import uuid
from datetime import date, datetime
from domain.entities.patient import Patient
from domain.value_objects.phone_number import PhoneNumber
from domain.repositories.i_unit_of_work import IUnitOfWork
from application.dtos.patient_dto import RegisterPatientDTO, PatientResponseDTO

class RegisterPatientUseCase:

    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    def execute(self, dto: RegisterPatientDTO) -> PatientResponseDTO:
        phone = PhoneNumber(dto.phone)

        with self._uow:
            existing = self._uow.patients.get_by_phone(phone)
            if existing:
                raise ValueError(f"Patient with phone {dto.phone} already exists. "
                                 f"Patient ID: {existing.patient_id}")

            patient_id = self._generate_patient_id()
            dob = datetime.strptime(dto.date_of_birth, '%Y-%m-%d').date() \
                  if dto.date_of_birth else None

            patient = Patient(
                id=uuid.uuid4(),
                patient_id=patient_id,
                full_name=dto.full_name.strip(),
                phone=phone,
                date_of_birth=dob,
                gender=dto.gender,
                address=dto.address,
                email=dto.email,
                national_id=dto.national_id,
                allergies=dto.allergies or [],
                chronic_diseases=dto.chronic_diseases or [],
            )

            saved = self._uow.patients.save(patient)
            self._uow.commit()

        return PatientResponseDTO(
            id=str(saved.id),
            patient_id=saved.patient_id,
            full_name=saved.full_name,
            phone=str(saved.phone),
            gender=saved.gender,
            age=saved.age,
            address=saved.address,
            email=saved.email,
            allergies=saved.allergies,
            chronic_diseases=saved.chronic_diseases,
        )

    def _generate_patient_id(self) -> str:
        from infrastructure.orm.models.patient_model import PatientModel
        count = PatientModel.objects.count()
        return f"MED-{str(count + 1).zfill(5)}"


# application/use_cases/appointment/book_appointment.py
import uuid
from datetime import datetime
from domain.entities.appointment import Appointment, AppointmentType, AppointmentStatus
from domain.repositories.i_unit_of_work import IUnitOfWork
from domain.services.i_notification_service import INotificationService
from application.dtos.appointment_dto import BookAppointmentDTO, AppointmentResponseDTO

class BookAppointmentUseCase:

    def __init__(self, uow: IUnitOfWork, notification_service: INotificationService):
        self._uow = uow
        self._notification = notification_service

    def execute(self, dto: BookAppointmentDTO) -> AppointmentResponseDTO:
        with self._uow:
            patient = self._uow.patients.get_by_id(uuid.UUID(dto.patient_id))
            if not patient:
                raise ValueError(f"Patient {dto.patient_id} not found")

            scheduled_at = datetime.fromisoformat(dto.scheduled_at)
            token = self._uow.appointments.get_next_token(
                scheduled_at.date(),
                uuid.UUID(dto.chamber_id) if dto.chamber_id else None
            )

            appointment = Appointment(
                id=uuid.uuid4(),
                patient_id=patient.id,
                doctor_id=uuid.UUID(dto.doctor_id),
                chamber_id=uuid.UUID(dto.chamber_id) if dto.chamber_id else None,
                scheduled_at=scheduled_at,
                appointment_type=AppointmentType(dto.appointment_type),
                status=AppointmentStatus.SCHEDULED,
                token_number=token,
                notes=dto.notes,
                created_by_id=uuid.UUID(dto.created_by_id) if dto.created_by_id else None,
            )

            saved = self._uow.appointments.save(appointment)
            self._uow.commit()

        # Notification after successful commit (outside transaction)
        try:
            self._notification.send_appointment_confirmation(patient, saved)
        except Exception:
            pass  # Non-blocking: log and continue

        return AppointmentResponseDTO(
            id=str(saved.id),
            patient_name=patient.full_name,
            patient_phone=str(patient.phone),
            scheduled_at=saved.scheduled_at.isoformat(),
            appointment_type=saved.appointment_type.value,
            status=saved.status.value,
            token_number=saved.token_number,
        )


# application/use_cases/consultation/complete_consultation.py
import uuid
from datetime import datetime
from domain.entities.consultation import Consultation
from domain.entities.appointment import AppointmentStatus
from domain.value_objects.vitals import Vitals
from domain.repositories.i_unit_of_work import IUnitOfWork
from application.dtos.consultation_dto import CompleteConsultationDTO

class CompleteConsultationUseCase:

    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    def execute(self, dto: CompleteConsultationDTO) -> dict:
        with self._uow:
            consultation = self._uow.consultations.get_by_id(uuid.UUID(dto.consultation_id))
            if not consultation:
                raise ValueError("Consultation not found")

            consultation.diagnosis = dto.diagnosis
            consultation.clinical_findings = dto.clinical_findings
            consultation.notes = dto.notes
            consultation.vitals = Vitals(
                blood_pressure_systolic=dto.bp_systolic,
                blood_pressure_diastolic=dto.bp_diastolic,
                pulse=dto.pulse,
                temperature=dto.temperature,
                weight=dto.weight,
                height=dto.height,
                spo2=dto.spo2,
            )
            consultation.complete()  # domain rule enforced

            # Update appointment status
            appointment = self._uow.appointments.get_by_id(consultation.appointment_id)
            if appointment:
                appointment.status = AppointmentStatus.COMPLETED
                self._uow.appointments.save(appointment)

            self._uow.consultations.save(consultation)
            self._uow.commit()

        return {"consultation_id": str(consultation.id), "status": "completed"}
```

---

## 8. Interface Layer

### 8.1 Dependency Injection Container

```python
# interfaces/api/container.py
from infrastructure.unit_of_work.django_unit_of_work import DjangoUnitOfWork
from infrastructure.services.whatsapp_service import WhatsAppNotificationService
from infrastructure.services.email_service import EmailNotificationService
from infrastructure.services.notification_composite import CompositeNotificationService
from application.use_cases.patient.register_patient import RegisterPatientUseCase
from application.use_cases.appointment.book_appointment import BookAppointmentUseCase
from application.use_cases.consultation.complete_consultation import CompleteConsultationUseCase

class Container:

    @staticmethod
    def notification_service() -> CompositeNotificationService:
        return CompositeNotificationService([
            WhatsAppNotificationService(),
            EmailNotificationService(),
        ])

    @staticmethod
    def register_patient_use_case() -> RegisterPatientUseCase:
        return RegisterPatientUseCase(uow=DjangoUnitOfWork())

    @staticmethod
    def book_appointment_use_case() -> BookAppointmentUseCase:
        return BookAppointmentUseCase(
            uow=DjangoUnitOfWork(),
            notification_service=Container.notification_service()
        )

    @staticmethod
    def complete_consultation_use_case() -> CompleteConsultationUseCase:
        return CompleteConsultationUseCase(uow=DjangoUnitOfWork())
```

### 8.2 DRF Serializers

```python
# interfaces/api/v1/patients/serializers.py
from rest_framework import serializers

class RegisterPatientSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=20)
    gender = serializers.ChoiceField(choices=['M', 'F', 'O'])
    address = serializers.CharField()
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    email = serializers.EmailField(required=False, allow_null=True)
    national_id = serializers.CharField(max_length=20, required=False, allow_null=True)
    allergies = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    chronic_diseases = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )

class PatientResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    patient_id = serializers.CharField()
    full_name = serializers.CharField()
    phone = serializers.CharField()
    gender = serializers.CharField()
    age = serializers.IntegerField(allow_null=True)
    address = serializers.CharField()
    email = serializers.EmailField(allow_null=True)
    allergies = serializers.ListField(child=serializers.CharField())
    chronic_diseases = serializers.ListField(child=serializers.CharField())


# interfaces/api/v1/appointments/serializers.py
from rest_framework import serializers

class BookAppointmentSerializer(serializers.Serializer):
    patient_id = serializers.UUIDField()
    scheduled_at = serializers.DateTimeField()
    appointment_type = serializers.ChoiceField(choices=['new', 'follow_up', 'walk_in'])
    chamber_id = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, default='')


class QueueItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    token_number = serializers.IntegerField()
    patient_name = serializers.CharField()
    patient_phone = serializers.CharField()
    scheduled_at = serializers.DateTimeField()
    status = serializers.CharField()
    appointment_type = serializers.CharField()
```

### 8.3 DRF Views

```python
# interfaces/api/v1/patients/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from interfaces.api.container import Container
from interfaces.api.v1.patients.serializers import RegisterPatientSerializer, PatientResponseSerializer
from interfaces.permissions import RolePermission
from application.dtos.patient_dto import RegisterPatientDTO

class PatientRegistrationView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(['doctor', 'receptionist', 'assistant'])]

    def post(self, request):
        serializer = RegisterPatientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        use_case = Container.register_patient_use_case()
        dto = RegisterPatientDTO(**serializer.validated_data)

        try:
            result = use_case.execute(dto)
            return Response(PatientResponseSerializer(result.__dict__).data,
                            status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_409_CONFLICT)


class PatientSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '')
        limit = int(request.query_params.get('limit', 20))
        offset = int(request.query_params.get('offset', 0))

        from infrastructure.repositories.django_patient_repository import DjangoPatientRepository
        repo = DjangoPatientRepository()
        patients = repo.search(query, limit=limit, offset=offset)

        return Response({
            'results': [PatientResponseSerializer(p.__dict__).data for p in patients],
            'limit': limit,
            'offset': offset,
        })


# interfaces/api/v1/appointments/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from interfaces.api.container import Container
from interfaces.api.v1.appointments.serializers import BookAppointmentSerializer, QueueItemSerializer
from interfaces.permissions import RolePermission
from application.dtos.appointment_dto import BookAppointmentDTO
import uuid

class BookAppointmentView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(['doctor', 'receptionist', 'assistant'])]

    def post(self, request):
        serializer = BookAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        use_case = Container.book_appointment_use_case()
        dto = BookAppointmentDTO(
            **serializer.validated_data,
            doctor_id=str(request.user.id),
            created_by_id=str(request.user.id),
        )

        try:
            result = use_case.execute(dto)
            return Response(result.__dict__, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class QueueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import date
        from infrastructure.repositories.django_appointment_repository import DjangoAppointmentRepository
        repo = DjangoAppointmentRepository()
        target_date = request.query_params.get('date', date.today().isoformat())
        chamber_id = request.query_params.get('chamber_id')

        queue = repo.get_queue(
            date.fromisoformat(target_date),
            uuid.UUID(chamber_id) if chamber_id else None
        )

        return Response({
            'date': target_date,
            'queue': [QueueItemSerializer(a.__dict__).data for a in queue],
            'total': len(queue),
        })
```

### 8.4 RBAC Permission Class

```python
# interfaces/permissions.py
from rest_framework.permissions import BasePermission

class RolePermission(BasePermission):

    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles

    def has_permission(self, request, view) -> bool:
        return (
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role in self.allowed_roles
        )
```

---

## 9. Authentication & RBAC

### JWT Setup (using `djangorestframework-simplejwt`)

```python
# config/settings/base.py (relevant section)
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Role-permission matrix
ROLE_PERMISSIONS = {
    'doctor': {
        'patients': ['view', 'create', 'update'],
        'appointments': ['view', 'create', 'update', 'delete'],
        'consultations': ['view', 'create', 'update'],
        'prescriptions': ['view', 'create', 'update', 'approve'],
        'billing': ['view', 'create', 'update'],
        'reports': ['view', 'create'],
        'analytics': ['view'],
    },
    'assistant_doctor': {
        'patients': ['view'],
        'consultations': ['view', 'create', 'update'],
        'prescriptions': ['view', 'create'],  # draft only — approval required
        'reports': ['view', 'create'],
    },
    'receptionist': {
        'patients': ['view', 'create', 'update'],
        'appointments': ['view', 'create', 'update'],
        'billing': ['view', 'create'],
    },
    'assistant': {
        'patients': ['view', 'create'],
        'appointments': ['view', 'create'],
    },
}
```

### Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/signup/` | Register a new user (super_admin only) |
| POST | `/api/v1/auth/login/` | Obtain JWT token pair |
| POST | `/api/v1/auth/refresh/` | Refresh access token |
| POST | `/api/v1/auth/logout/` | Blacklist refresh token |
| GET | `/api/v1/auth/me/` | Current user profile |

---

## 10. Key API Endpoints

### Patient Module

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/patients/` | receptionist+ | Register patient |
| GET | `/api/v1/patients/` | all | List/search patients |
| GET | `/api/v1/patients/{id}/` | all | Patient profile |
| PATCH | `/api/v1/patients/{id}/` | receptionist+ | Update patient |
| GET | `/api/v1/patients/{id}/timeline/` | all | Patient full timeline |
| GET | `/api/v1/patients/{id}/appointments/` | all | Patient appointments |

### Appointment Module

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/appointments/` | receptionist+ | Book appointment |
| GET | `/api/v1/appointments/` | all | List appointments |
| GET | `/api/v1/appointments/queue/` | all | Today's queue |
| PATCH | `/api/v1/appointments/{id}/status/` | receptionist+ | Update status |
| DELETE | `/api/v1/appointments/{id}/` | doctor | Cancel appointment |

### Consultation Module

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/consultations/` | doctor, assistant_doctor | Start consultation |
| GET | `/api/v1/consultations/{id}/` | doctor, assistant_doctor | Get consultation |
| PATCH | `/api/v1/consultations/{id}/` | doctor, assistant_doctor | Update consultation |
| POST | `/api/v1/consultations/{id}/complete/` | doctor | Complete consultation |
| POST | `/api/v1/consultations/{id}/vitals/` | all | Record vitals |

### Prescription Module

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/prescriptions/` | doctor, assistant_doctor | Create prescription |
| GET | `/api/v1/prescriptions/{id}/` | all | Get prescription |
| PATCH | `/api/v1/prescriptions/{id}/approve/` | doctor | Approve draft |
| GET | `/api/v1/prescriptions/{id}/pdf/` | all | Download PDF |
| POST | `/api/v1/prescriptions/{id}/share/` | all | Share via WhatsApp/Email |
| GET | `/api/v1/medicines/search/` | all | Autocomplete drug search |

### Billing Module

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/invoices/` | receptionist+ | Create invoice |
| GET | `/api/v1/invoices/{id}/` | all | Get invoice |
| POST | `/api/v1/invoices/{id}/pay/` | receptionist+ | Record payment |
| GET | `/api/v1/invoices/{id}/print/` | all | Printable invoice |
| GET | `/api/v1/analytics/revenue/` | doctor | Revenue report |
| GET | `/api/v1/analytics/patients/` | doctor | Patient volume stats |

### Request / Response Examples

#### POST /api/v1/patients/
```json
// Request
{
  "full_name": "Mohammad Karim",
  "phone": "01712345678",
  "gender": "M",
  "date_of_birth": "1985-03-15",
  "address": "123 Dhanmondi, Dhaka",
  "allergies": ["Penicillin"],
  "chronic_diseases": ["Type 2 Diabetes", "Hypertension"]
}

// Response 201
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "patient_id": "MED-00042",
  "full_name": "Mohammad Karim",
  "phone": "8801712345678",
  "gender": "M",
  "age": 41,
  "address": "123 Dhanmondi, Dhaka",
  "email": null,
  "allergies": ["Penicillin"],
  "chronic_diseases": ["Type 2 Diabetes", "Hypertension"]
}
```

#### POST /api/v1/appointments/
```json
// Request
{
  "patient_id": "550e8400-e29b-41d4-a716-446655440000",
  "scheduled_at": "2026-04-01T10:00:00+06:00",
  "appointment_type": "new",
  "chamber_id": "chamber-uuid",
  "notes": "First visit"
}

// Response 201
{
  "id": "appt-uuid",
  "patient_name": "Mohammad Karim",
  "patient_phone": "8801712345678",
  "scheduled_at": "2026-04-01T10:00:00+06:00",
  "appointment_type": "new",
  "status": "scheduled",
  "token_number": 7
}
```

#### GET /api/v1/appointments/queue/?date=2026-04-01
```json
{
  "date": "2026-04-01",
  "total": 3,
  "queue": [
    {
      "id": "appt-uuid-1",
      "token_number": 1,
      "patient_name": "Rahim Uddin",
      "patient_phone": "8801812345678",
      "scheduled_at": "2026-04-01T09:00:00+06:00",
      "status": "in_progress",
      "appointment_type": "follow_up"
    },
    {
      "id": "appt-uuid-2",
      "token_number": 2,
      "patient_name": "Fatima Begum",
      "patient_phone": "8801912345678",
      "scheduled_at": "2026-04-01T09:30:00+06:00",
      "status": "in_queue",
      "appointment_type": "new"
    }
  ]
}
```

#### POST /api/v1/prescriptions/
```json
// Request
{
  "consultation_id": "consult-uuid",
  "items": [
    {
      "medicine_id": "brand-uuid",
      "medicine_name": "Metformin 500mg",
      "morning": "1",
      "afternoon": "0",
      "evening": "1",
      "duration_days": 30,
      "route": "oral",
      "instructions": "After meal"
    },
    {
      "medicine_id": "brand-uuid-2",
      "medicine_name": "Amlodipine 5mg",
      "morning": "1",
      "afternoon": "0",
      "evening": "0",
      "duration_days": 30,
      "instructions": "Before breakfast"
    }
  ],
  "follow_up_date": "2026-05-01"
}

// Response 201
{
  "id": "rx-uuid",
  "consultation_id": "consult-uuid",
  "status": "active",
  "items": [...],
  "follow_up_date": "2026-05-01",
  "pdf_url": "/api/v1/prescriptions/rx-uuid/pdf/"
}
```

---

## 11. Notification System Design

### Architecture

```
Application Layer
    ↓ calls interface
INotificationService (domain/services/i_notification_service.py)
    ↑ implemented by
CompositeNotificationService  ──→  WhatsAppNotificationService
    (fan-out)                  ──→  EmailNotificationService
```

### Implementations

```python
# infrastructure/services/whatsapp_service.py
import requests
from domain.services.i_notification_service import INotificationService
from domain.entities.patient import Patient
from domain.entities.appointment import Appointment
from domain.entities.prescription import Prescription

class WhatsAppNotificationService(INotificationService):
    """Twilio WhatsApp API or Meta Business API"""

    def __init__(self):
        import os
        self._api_url = os.getenv('WHATSAPP_API_URL')
        self._token = os.getenv('WHATSAPP_API_TOKEN')
        self._from_number = os.getenv('WHATSAPP_FROM_NUMBER')

    def _send(self, to: str, message: str) -> bool:
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": message}
        }
        headers = {"Authorization": f"Bearer {self._token}"}
        resp = requests.post(self._api_url, json=payload, headers=headers, timeout=10)
        return resp.status_code == 200

    def send_appointment_confirmation(self, patient: Patient, appointment: Appointment) -> bool:
        message = (
            f"প্রিয় {patient.full_name},\n\n"
            f"আপনার অ্যাপয়েন্টমেন্ট নিশ্চিত করা হয়েছে।\n"
            f"তারিখ ও সময়: {appointment.scheduled_at.strftime('%d %b %Y, %I:%M %p')}\n"
            f"টোকেন নম্বর: {appointment.token_number}\n\n"
            f"Dear {patient.full_name},\n"
            f"Your appointment is confirmed.\n"
            f"Date & Time: {appointment.scheduled_at.strftime('%d %b %Y, %I:%M %p')}\n"
            f"Token No: {appointment.token_number}"
        )
        return self._send(str(patient.phone), message)

    def send_appointment_reminder(self, patient: Patient, appointment: Appointment) -> bool:
        message = (
            f"Reminder: Your appointment is tomorrow at "
            f"{appointment.scheduled_at.strftime('%I:%M %p')}. "
            f"Token No: {appointment.token_number}"
        )
        return self._send(str(patient.phone), message)

    def send_prescription(self, patient: Patient, prescription: Prescription,
                          pdf_bytes: bytes) -> bool:
        # Send PDF via WhatsApp document message
        message = (
            f"Dear {patient.full_name},\n"
            f"Your prescription has been shared. Please collect medicines as prescribed."
        )
        # Upload document + send (Meta API supports document messages)
        return self._send_document(str(patient.phone), pdf_bytes, message)

    def send_follow_up_reminder(self, patient: Patient, follow_up_date: str) -> bool:
        message = f"Dear {patient.full_name}, your follow-up visit is due on {follow_up_date}."
        return self._send(str(patient.phone), message)

    def _send_document(self, to: str, pdf_bytes: bytes, caption: str) -> bool:
        # Upload to media endpoint first, then send document message
        # Implementation depends on WhatsApp Business API provider
        pass


# infrastructure/services/email_service.py
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from domain.services.i_notification_service import INotificationService
from domain.entities.patient import Patient
from domain.entities.appointment import Appointment
from domain.entities.prescription import Prescription

class EmailNotificationService(INotificationService):

    def send_appointment_confirmation(self, patient: Patient, appointment: Appointment) -> bool:
        if not patient.email:
            return False
        html = render_to_string('emails/appointment_confirmation.html', {
            'patient': patient,
            'appointment': appointment,
        })
        msg = EmailMessage(
            subject='Appointment Confirmed — MediDesk',
            body=html,
            to=[patient.email],
        )
        msg.content_subtype = 'html'
        try:
            msg.send()
            return True
        except Exception:
            return False

    def send_prescription(self, patient: Patient, prescription: Prescription,
                          pdf_bytes: bytes) -> bool:
        if not patient.email:
            return False
        msg = EmailMessage(
            subject='Your Prescription — MediDesk',
            body='Please find your prescription attached.',
            to=[patient.email],
        )
        msg.attach('prescription.pdf', pdf_bytes, 'application/pdf')
        try:
            msg.send()
            return True
        except Exception:
            return False

    def send_appointment_reminder(self, patient: Patient, appointment: Appointment) -> bool:
        return self.send_appointment_confirmation(patient, appointment)

    def send_follow_up_reminder(self, patient: Patient, follow_up_date: str) -> bool:
        if not patient.email:
            return False
        msg = EmailMessage(
            subject='Follow-up Reminder — MediDesk',
            body=f"Dear {patient.full_name},\n\nYour follow-up visit is due on {follow_up_date}.",
            to=[patient.email],
        )
        try:
            msg.send()
            return True
        except Exception:
            return False


# infrastructure/services/notification_composite.py
from typing import List
from domain.services.i_notification_service import INotificationService
from domain.entities.patient import Patient
from domain.entities.appointment import Appointment
from domain.entities.prescription import Prescription
import logging

logger = logging.getLogger(__name__)

class CompositeNotificationService(INotificationService):
    """Fan-out to multiple channels. Adding a new channel requires zero changes here."""

    def __init__(self, services: List[INotificationService]):
        self._services = services

    def send_appointment_confirmation(self, patient: Patient, appointment: Appointment) -> bool:
        return self._fan_out('send_appointment_confirmation', patient, appointment)

    def send_appointment_reminder(self, patient: Patient, appointment: Appointment) -> bool:
        return self._fan_out('send_appointment_reminder', patient, appointment)

    def send_prescription(self, patient: Patient, prescription: Prescription,
                          pdf_bytes: bytes) -> bool:
        return self._fan_out('send_prescription', patient, prescription, pdf_bytes)

    def send_follow_up_reminder(self, patient: Patient, follow_up_date: str) -> bool:
        return self._fan_out('send_follow_up_reminder', patient, follow_up_date)

    def _fan_out(self, method: str, *args) -> bool:
        results = []
        for service in self._services:
            try:
                result = getattr(service, method)(*args)
                results.append(result)
            except Exception as e:
                logger.error(f"Notification failed [{service.__class__.__name__}]: {e}")
                results.append(False)
        return any(results)  # True if at least one channel succeeded
```

---

## 12. Frontend Architecture

### Project Structure
```
frontend/
├── src/
│   ├── app/
│   │   ├── store.ts                    # Zustand root store
│   │   ├── router.tsx                  # React Router v6
│   │   └── queryClient.ts             # TanStack Query client
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/LoginForm.tsx
│   │   │   ├── hooks/useAuth.ts
│   │   │   ├── store/authStore.ts       # Zustand slice
│   │   │   └── api/authApi.ts
│   │   │
│   │   ├── patients/
│   │   │   ├── components/
│   │   │   │   ├── PatientRegistrationForm.tsx
│   │   │   │   ├── PatientProfile.tsx
│   │   │   │   ├── PatientTimeline.tsx
│   │   │   │   └── PatientSearch.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── usePatients.ts      # TanStack Query hooks
│   │   │   │   └── usePatientSearch.ts
│   │   │   ├── types/patient.types.ts
│   │   │   └── api/patientApi.ts
│   │   │
│   │   ├── appointments/
│   │   │   ├── components/
│   │   │   │   ├── AppointmentBooking.tsx
│   │   │   │   ├── QueueBoard.tsx       # Live token display
│   │   │   │   └── DailySchedule.tsx
│   │   │   ├── hooks/useQueue.ts
│   │   │   └── api/appointmentApi.ts
│   │   │
│   │   ├── consultation/
│   │   │   ├── components/
│   │   │   │   ├── ConsultationForm.tsx
│   │   │   │   ├── VitalsForm.tsx
│   │   │   │   └── DiagnosisInput.tsx
│   │   │   └── api/consultationApi.ts
│   │   │
│   │   ├── prescription/
│   │   │   ├── components/
│   │   │   │   ├── PrescriptionEditor.tsx
│   │   │   │   ├── MedicineSearch.tsx   # Autocomplete
│   │   │   │   └── PrescriptionPreview.tsx
│   │   │   └── api/prescriptionApi.ts
│   │   │
│   │   ├── billing/
│   │   │   ├── components/
│   │   │   │   ├── InvoiceForm.tsx
│   │   │   │   ├── PaymentForm.tsx
│   │   │   │   └── InvoicePrint.tsx
│   │   │   └── api/billingApi.ts
│   │   │
│   │   └── analytics/
│   │       ├── components/
│   │       │   ├── RevenueDashboard.tsx
│   │       │   └── PatientVolumeChart.tsx
│   │       └── api/analyticsApi.ts
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── Layout/Sidebar.tsx
│   │   │   ├── Layout/Header.tsx
│   │   │   ├── Table/DataTable.tsx
│   │   │   ├── Form/PhoneInput.tsx     # BD phone format
│   │   │   └── UI/Badge.tsx
│   │   ├── hooks/
│   │   │   └── useDebounce.ts
│   │   ├── lib/
│   │   │   ├── apiClient.ts           # Axios instance with JWT interceptor
│   │   │   └── dateUtils.ts           # Bangladesh timezone helpers
│   │   └── types/api.types.ts
│   │
│   └── i18n/
│       ├── en.json
│       ├── bn.json                    # Bangla translations
│       └── i18n.ts                   # i18next config
│
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### API Client with JWT Interceptor
```typescript
// src/shared/lib/apiClient.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh/', { refresh });
          localStorage.setItem('access_token', data.access);
          error.config.headers.Authorization = `Bearer ${data.access}`;
          return apiClient(error.config);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Auth Store (Zustand)
```typescript
// src/features/auth/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  full_name: string;
  role: 'doctor' | 'assistant_doctor' | 'receptionist' | 'assistant';
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, isAuthenticated: false });
      },
    }),
    { name: 'auth-storage' }
  )
);
```

### Patient API Integration
```typescript
// src/features/patients/api/patientApi.ts
import apiClient from '@/shared/lib/apiClient';

export interface RegisterPatientPayload {
  full_name: string;
  phone: string;
  gender: 'M' | 'F' | 'O';
  address: string;
  date_of_birth?: string;
  email?: string;
  allergies?: string[];
  chronic_diseases?: string[];
}

export const patientApi = {
  register: (payload: RegisterPatientPayload) =>
    apiClient.post('/patients/', payload).then(r => r.data),

  search: (query: string, limit = 20, offset = 0) =>
    apiClient.get('/patients/', { params: { q: query, limit, offset } }).then(r => r.data),

  getProfile: (id: string) =>
    apiClient.get(`/patients/${id}/`).then(r => r.data),

  getTimeline: (id: string) =>
    apiClient.get(`/patients/${id}/timeline/`).then(r => r.data),
};

// src/features/patients/hooks/usePatients.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi, RegisterPatientPayload } from '../api/patientApi';
import { useDebounce } from '@/shared/hooks/useDebounce';

export const usePatientSearch = (query: string) => {
  const debouncedQuery = useDebounce(query, 300);
  return useQuery({
    queryKey: ['patients', 'search', debouncedQuery],
    queryFn: () => patientApi.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });
};

export const useRegisterPatient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterPatientPayload) => patientApi.register(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
};
```

---

## 13. End-to-End Flows

### Flow 1: New Patient Registration

```
Receptionist → UI                          Backend
     │                                        │
     │── POST /api/v1/patients/ ─────────────→│
     │   {full_name, phone, gender, ...}      │
     │                                        │── PhoneNumber.validate()
     │                                        │── Check duplicate phone (repo)
     │                                        │── Generate patient_id "MED-00042"
     │                                        │── Patient entity created
     │                                        │── UoW.patients.save()
     │                                        │── UoW.commit() [DB transaction]
     │←── 201 {patient_id: "MED-00042"} ─────│
     │                                        │
```

### Flow 2: Appointment Booking + Token Assignment

```
Receptionist                               Backend                      WhatsApp
     │                                        │                             │
     │── POST /api/v1/appointments/ ─────────→│                             │
     │   {patient_id, scheduled_at, type}     │                             │
     │                                        │── Validate patient exists   │
     │                                        │── get_next_token(date)      │
     │                                        │── Create Appointment entity │
     │                                        │── UoW.save() + commit()     │
     │←── 201 {token_number: 7} ─────────────│                             │
     │                                        │── notify.send_confirmation()│
     │                                        │──────────────────────────→  │
     │                                        │   "Token 7, 10:00 AM"       │
```

### Flow 3: Consultation + Prescription (Full Flow)

```
Doctor                                     Backend
  │                                            │
  │── POST /api/v1/consultations/ ────────────→│
  │   {appointment_id, chief_complaints}       │── Start consultation (is_draft=True)
  │←── 201 {consultation_id} ─────────────────│
  │                                            │
  │── PATCH /consultations/{id}/vitals/ ──────→│── Record vitals (Vitals value object)
  │                                            │
  │── POST /consultations/{id}/complete/ ─────→│── diagnosis required (domain rule)
  │   {diagnosis, clinical_findings, ...}      │── consultation.complete()
  │                                            │── appointment → COMPLETED
  │                                            │── UoW.commit()
  │                                            │
  │── POST /api/v1/prescriptions/ ────────────→│── Create PrescriptionItems
  │   {consultation_id, items, follow_up}      │── Snapshot medicine name
  │                                            │── Generate PDF (WeasyPrint)
  │←── 201 {rx_id, pdf_url} ──────────────────│
  │                                            │
  │── POST /prescriptions/{id}/share/ ────────→│── CompositeNotificationService
  │                                            │── WhatsApp: send PDF document
  │                                            │── Email: attach PDF
  │←── 200 {whatsapp: true, email: true} ─────│
```

### Flow 4: Billing + Payment

```
Receptionist                               Backend
  │                                            │
  │── POST /api/v1/invoices/ ─────────────────→│
  │   {patient_id, consultation_id,            │── Create Invoice + InvoiceItems
  │    items: [{desc, qty, price}],            │── Calculate total with discount
  │    discount_percent: 10}                   │── status: "issued"
  │←── 201 {invoice_id, total: 900 BDT} ──────│
  │                                            │
  │── POST /invoices/{id}/pay/ ───────────────→│── Record Payment
  │   {amount: 900, method: "bkash",           │── Verify amount vs outstanding
  │    transaction_ref: "BK123456"}            │── Invoice status → "paid"
  │←── 200 {status: "paid"} ──────────────────│
```

---

## 14. Search & Filtering

```python
# All search via Django ORM in repository — never in views or use cases

# Patient search (name | phone | patient_id)
PatientModel.objects.filter(
    Q(full_name__icontains=query) |
    Q(phone__icontains=query) |
    Q(patient_id__icontains=query),
    is_active=True
).order_by('full_name')

# Appointment filters
AppointmentModel.objects.filter(
    scheduled_at__date=target_date,
    status__in=['scheduled', 'confirmed', 'in_queue'],
    chamber_id=chamber_id,  # optional
).select_related('patient').order_by('token_number')

# Medicine autocomplete (brand + generic)
BrandMedicineModel.objects.filter(
    Q(brand_name__icontains=query) |
    Q(generic__generic_name__icontains=query),
    is_active=True
).select_related('generic')[:10]

# Consultation search by diagnosis
ConsultationModel.objects.filter(
    patient_id=patient_id,
    diagnosis__icontains=query
).order_by('-created_at')

# Revenue analytics
from django.db.models import Sum, Count
PaymentModel.objects.filter(
    paid_at__date__gte=start_date,
    paid_at__date__lte=end_date,
).values('method').annotate(
    total=Sum('amount'),
    count=Count('id')
)
```

---

## 15. Document Management

```python
# infrastructure/services/storage_service.py
import os
from django.core.files.storage import FileSystemStorage
from django.conf import settings

class DocumentStorageService:

    def __init__(self):
        self._storage = FileSystemStorage(
            location=settings.MEDIA_ROOT,
            base_url=settings.MEDIA_URL,
        )

    def save_report(self, patient_id: str, filename: str, content: bytes) -> str:
        path = f"patients/{patient_id}/reports/{filename}"
        name = self._storage.save(path, ContentFile(content))
        return self._storage.url(name)

    def save_prescription_pdf(self, patient_id: str, rx_id: str, pdf_bytes: bytes) -> str:
        path = f"patients/{patient_id}/prescriptions/{rx_id}.pdf"
        name = self._storage.save(path, ContentFile(pdf_bytes))
        return self._storage.url(name)

    def get_file_url(self, path: str) -> str:
        return self._storage.url(path)
```

**Storage layout:**
```
media/
├── patients/
│   └── {patient_uuid}/
│       ├── reports/
│       │   └── 2026-04-01_blood_test.pdf
│       └── prescriptions/
│           └── {rx_uuid}.pdf
```

---

## 16. Database Indexing Strategy

| Table | Indexed Columns | Rationale |
|-------|----------------|-----------|
| `patients` | `phone`, `patient_id`, `full_name` | Primary lookup fields |
| `appointments` | `(scheduled_at, status)`, `(patient, scheduled_at)`, `(doctor, scheduled_at)` | Queue and daily schedule queries |
| `consultations` | `(patient, created_at)`, `diagnosis` | Timeline and clinical search |
| `prescriptions` | `patient`, `status` | Patient Rx history |
| `invoice_items` | `invoice` | Invoice line item fetching |
| `payments` | `paid_at`, `invoice` | Daily revenue reports |
| `audit_logs` | `(user, timestamp)`, `(resource_type, resource_id)` | Activity tracking |
| `brand_medicines` | `brand_name`, `(generic, is_active)` | Autocomplete performance |
| `report_documents` | `(patient, uploaded_at)`, `category` | Timeline and filtering |

---

## 17. Backup Strategy

### Automatic Server-Level Backup (Cron)

```bash
# /etc/cron.d/medidesk-backup
# Daily backup at 2 AM Bangladesh time (UTC+6 → 8 PM UTC)
0 20 * * * postgres pg_dump -Fc medidesk > /backups/medidesk_$(date +\%Y\%m\%d).dump

# Keep last 30 days, delete older
0 21 * * * find /backups/ -name "*.dump" -mtime +30 -delete
```

### Manual Backup Script

```bash
#!/bin/bash
# scripts/backup.sh
BACKUP_DIR="/backups/manual"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="medidesk_manual_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"
pg_dump -Fc -h localhost -U medidesk_user medidesk > "$BACKUP_DIR/$FILENAME"

echo "Backup saved: $BACKUP_DIR/$FILENAME"
echo "Size: $(du -sh $BACKUP_DIR/$FILENAME | cut -f1)"
```

### Restore

```bash
pg_restore -d medidesk_restore -Fc /backups/medidesk_20260401.dump
```

---

## 18. Localization

```python
# config/settings/base.py
LANGUAGE_CODE = 'en-us'
LANGUAGES = [
    ('en', 'English'),
    ('bn', 'Bengali'),
]
USE_I18N = True
USE_L10N = True
USE_TZ = True
TIME_ZONE = 'Asia/Dhaka'  # UTC+6
```

```json
// frontend/src/i18n/bn.json (sample)
{
  "patient": {
    "register": "রোগী নিবন্ধন",
    "name": "নাম",
    "phone": "ফোন নম্বর",
    "gender": "লিঙ্গ",
    "male": "পুরুষ",
    "female": "মহিলা",
    "appointment": "অ্যাপয়েন্টমেন্ট",
    "token": "টোকেন নম্বর"
  },
  "consultation": {
    "diagnosis": "রোগ নির্ণয়",
    "prescription": "প্রেসক্রিপশন",
    "vitals": "ভাইটালস"
  },
  "billing": {
    "invoice": "ইনভয়েস",
    "payment": "পেমেন্ট",
    "cash": "নগদ",
    "bkash": "বিকাশ"
  }
}
```

---

## 19. MVP Phased Roadmap

### Phase 1 — MVP (Weeks 1–6)
| Module | Tasks |
|--------|-------|
| Project setup | Django + DRF, PostgreSQL, Clean Architecture scaffold, JWT auth |
| User & RBAC | User model, role enforcement, JWT login |
| Patient Management | Registration, profile, search |
| Appointment & Queue | Time-slot booking, walk-ins, token system, live queue |
| Consultation | Vitals, diagnosis, notes |
| Prescription | Drug DB seed (BD brands), Rx editor, PDF generation |
| Basic Billing | Invoice creation, cash + bKash payment |
| WhatsApp Notifications | Appointment confirmation, prescription share |
| Frontend | Login, patient registration, queue board, Rx editor |

### Phase 2 — Core Complete (Weeks 7–10)
| Module | Tasks |
|--------|-------|
| Email Notifications | Email templates, delivery |
| Test & Report Management | Lab orders, PDF/image upload, viewer |
| Analytics | Revenue report, patient volume, appointment trends |
| Audit Logs | Full activity tracking |
| Document Management | Organized per-patient storage |
| Multi-Chamber | Chamber model, schedule separation |
| Frontend completeness | Billing, reports, analytics dashboard |

### Phase 3 — Polish & Advanced (Weeks 11–14)
| Module | Tasks |
|--------|-------|
| Clinical Insights | Common diagnoses, follow-up tracking |
| Localization | Full Bangla UI |
| Prescription customization | Clinic logo, letterhead branding |
| Follow-up reminders | Scheduled WhatsApp reminders |
| 2FA (optional) | TOTP support |
| Performance tuning | Query optimization, pagination |
| Production deployment | Nginx + Gunicorn + Docker Compose |

### Phase 4 — Future
- Flutter mobile app (appointment tracking, Rx access)
- AI diagnosis suggestions
- OCR for report scanning
- Telemedicine integration

---

## 20. Non-Functional Requirements

### Security
- All endpoints require JWT authentication
- Role-based permission checks on every view
- Sensitive fields (NID, phone) treated with care — no logging
- `django-axes` for brute force protection on login
- HTTPS enforced in production (`SECURE_SSL_REDIRECT = True`)
- CORS whitelist configured (`django-cors-headers`)
- `SECRET_KEY` and credentials loaded from environment variables only

### Performance
- `select_related` / `prefetch_related` used in all list queries to prevent N+1
- Database indexes on all FK and filter columns
- Pagination enforced on all list endpoints (default: 20, max: 100)
- PDF generation is async (Celery task) to avoid blocking API responses

### Scalability
- Stateless API (JWT) — horizontally scalable
- Celery + Redis for async tasks (PDF generation, bulk notifications)
- DB connection pooling via `pgbouncer` in production

### Code Quality
- All use cases are independently unit-testable (mock repositories)
- Zero direct ORM usage outside `infrastructure/`
- Type hints throughout Python code
- Pre-commit hooks: `black`, `isort`, `mypy`

### Deployment Stack
```yaml
# docker-compose.yml (production)
services:
  web:
    image: medidesk:latest
    command: gunicorn config.wsgi:application --workers 4 --bind 0.0.0.0:8000
    env_file: .env
    depends_on: [db, redis]

  worker:
    image: medidesk:latest
    command: celery -A config worker -l info
    env_file: .env

  db:
    image: postgres:16
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - static_files:/app/staticfiles
    ports: ["80:80", "443:443"]
```

---

*Plan version: 1.0 | Date: 2026-03-30 | System: MediDesk — Bangladesh Clinic Management*
