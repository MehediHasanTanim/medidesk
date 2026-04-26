# Domain Entities

## Key entities and status enums

### Appointment
File: `backend/domain/entities/appointment.py`
- `status`: `SCHEDULED → CONFIRMED → CHECKED_IN → IN_QUEUE → IN_PROGRESS → COMPLETED | CANCELLED | NO_SHOW`
- `appointment_type`: `REGULAR | WALK_IN | FOLLOW_UP`
- `token_number`: nullable — assigned at check-in (or immediately for walk-in)
- One doctor per 15-minute slot (conflict check enforced by `has_conflict()`)

### Consultation
File: `backend/domain/entities/consultation.py`
- `status`: `IN_PROGRESS → COMPLETED`
- Linked 1-to-1 with one appointment
- `doctor_id` is the owner — drives `ConsultationOwnershipMixin` scoping

### Prescription
File: `backend/domain/entities/prescription.py`
- `status`: `DRAFT → ACTIVE`
- `DRAFT` for assistant_doctor submissions; doctor approval moves to `ACTIVE`
- Doctors write directly to `ACTIVE`
- One prescription per consultation (1-to-1 FK)
- May have `follow_up_date` → triggers `ScheduleFollowUpUseCase` after commit

### Invoice
File: `backend/domain/entities/billing.py`
- Linked to consultation
- `status`: `PENDING → PAID | PARTIALLY_PAID | CANCELLED`
- Payment methods: `CASH | BKASH | NAGAD | CARD`

### Patient
File: `backend/domain/entities/patient.py`
- `patient_id`: `MED-XXXXX` format (auto-generated)
- Phone is primary identifier; duplicates allowed (migration 0005)

## Value objects
- `Money(amount: Decimal, currency: str = "BDT")` — BDT only, no multi-currency
- `PhoneNumber` — BD format validation: `880/01[3-9]XXXXXXXX`
- `Dosage` — immutable, represents medicine dosage
- `Vitals` — immutable measurements (BP, weight, etc.)
