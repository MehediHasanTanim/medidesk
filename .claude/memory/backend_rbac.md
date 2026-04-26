# RBAC & Permissions

## Permission class factories
File: `backend/interfaces/permissions.py`

### `ModulePermission(module, action=None)`
Checks `ROLE_PERMISSIONS[role][module]` contains the derived action.
- HTTP method → action: GET→view, POST→create, PUT/PATCH→update, DELETE→delete
- `action=` override needed for action-style POSTs (e.g. `/complete/`, `/approve/`, `/check-in/`)
- Admin/super_admin always pass

```python
permission_classes = [IsAuthenticated, ModulePermission("appointments")]
permission_classes = [IsAuthenticated, ModulePermission("consultations", action="update")]
```

### `RolePermission(["role1", "role2"])`
Factory returning a class (not an instance). Admin/super_admin always pass.

```python
permission_classes = [IsAuthenticated, RolePermission(["doctor", "receptionist"])]
```

### `AdminOnly`
Only `admin` or `super_admin`.

## Ownership mixins (call after loading the resource)
- `ConsultationOwnershipMixin.check_consultation_scope(request, consultation_doctor_id)` — doctors/assistant_doctors can only write to their own consultations (or supervised ones)
- `ReceptionistChamberScopeMixin.check_chamber_scope(request, chamber_id)` — receptionists/assistants limited to their assigned chambers

Both return `Response({"error": "Access denied"}, 403)` on failure or `None` on pass.

## Role hierarchy (permission escalation order)
```
super_admin ≥ admin > doctor ≈ receptionist > assistant_doctor ≈ assistant > trainee
```
Admin/super_admin bypass ALL ModulePermission checks — never list them in ROLE_PERMISSIONS.

## Key matrix shortcuts
- `billing.update` → receptionist only (not assistant)
- `patients.create` → receptionist, assistant, doctor (NOT assistant_doctor)
- `prescriptions.*` → doctor, assistant_doctor only
- `reports.*` → doctor, assistant_doctor only
- `trainee` → view-only on all clinical modules, no billing

## RBAC logger
All denials log at WARNING via `medidesk.rbac` logger with user_id, role, method, path.
