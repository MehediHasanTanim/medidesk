# ORM Models Map

All models: `app_label = "infrastructure"`, migrations in `backend/infrastructure/migrations/`

| DB Table | ORM Model | Domain Entity | File |
|---|---|---|---|
| `users` | `UserModel` | `User` | `user_model.py` |
| `chambers` | `ChamberModel` | `Chamber` | `chamber_model.py` |
| `patients` | `PatientModel` | `Patient` | `patient_model.py` |
| `appointments` | `AppointmentModel` | `Appointment` | `appointment_model.py` |
| `consultations` | `ConsultationModel` | `Consultation` | `consultation_model.py` |
| `prescriptions` | `PrescriptionModel` | `Prescription` | `prescription_model.py` |
| `prescription_items` | `PrescriptionItemModel` | `PrescriptionItem` | `prescription_model.py` |
| `specialities` | `SpecialityModel` | `Speciality` | `doctor_model.py` |
| `doctor_profiles` | `DoctorProfileModel` | `DoctorProfile` | `doctor_model.py` |
| `invoices` | `InvoiceModel` | `Invoice` | `billing_model.py` |
| `medicines` | `MedicineModel` | `Medicine` | `medicine_model.py` |
| `test_orders` | `TestOrderModel` | `TestOrder` | `test_order_model.py` |
| `audit_logs` | `AuditLogModel` | `AuditLog` | `audit_log_model.py` |

All ORM model files: `backend/infrastructure/orm/models/{entity}_model.py`

## UserModel extra fields
- `role` CharField: `super_admin | admin | doctor | assistant_doctor | receptionist | assistant | trainee`
- `chambers` M2M to `ChamberModel` (used by receptionist/assistant chamber scoping)
- `supervisor_id` FK to self (assistant_doctor → doctor supervisor)
- `is_active`, `is_staff`, `is_superuser` from Django AbstractUser

## Migration notes
- Migration `0005`: removed `UNIQUE` constraint on patient phone (duplicates now allowed)
- All migrations must be created/applied via `docker compose exec backend python manage.py makemigrations/migrate`
