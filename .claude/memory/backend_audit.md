# Audit Log System

## Overview
Every write action on clinical resources is logged to `audit_logs` table.

## `AuditMixin`
File: `backend/interfaces/api/v1/mixins.py`

Inherit alongside `APIView`. Call after successful writes:
```python
class MyView(AuditMixin, APIView):
    def post(self, request):
        # … create resource …
        self.log_audit(request, "appointment", str(result.id), "create")
        return Response(...)
```

Parameters: `resource` (module name string), `resource_id` (str UUID), `action` ("create"|"update"|"delete"|"view")

## ORM Model
`backend/infrastructure/orm/models/audit_log_model.py` → `AuditLogModel` → table `audit_logs`

## Repository
`DjangoAuditLogRepository` is in `DjangoUnitOfWork` as `uow.audit_logs`.
Use case: `backend/application/use_cases/audit/list_audit_logs.py`

## API endpoint
`GET /api/v1/audit-logs/` — admin-only, paginated, filterable by resource/action/user/date.
Frontend: `frontend/src/features/auditLogs/pages/AuditLogsPage.tsx`

## What to audit
All POST/PUT/PATCH/DELETE on: appointments, consultations, prescriptions, billing, patients, test_orders, reports.
GET on sensitive views (patient history, audit log itself) is optional.
