# Audit Log Implementation Plan

**Goal:** Track all user activity across MediDesk — create, update, delete, view, login, and logout events — with a searchable admin UI.

**Current state:** `AuditLogModel` already exists in `backend/infrastructure/orm/models/audit_log_model.py` with the correct schema (`id`, `user`, `action`, `resource_type`, `resource_id`, `payload`, `ip_address`, `timestamp`). The table and indexes are created by migration `0001_initial`. Nothing writes to it yet.

---

## Backend Implementation

### Task 1 — Domain layer: AuditLog entity + repository interface

**Files to create:**
- `backend/domain/entities/audit_log.py`
- `backend/domain/repositories/i_audit_log_repository.py`

**`audit_log.py`** — dataclass entity mirroring model fields:
```python
@dataclass
class AuditLog:
    id: UUID
    user_id: UUID | None
    action: str               # CREATE | UPDATE | DELETE | VIEW | LOGIN | LOGOUT
    resource_type: str        # e.g. "patient", "appointment", "prescription"
    resource_id: str
    payload: dict
    ip_address: str | None
    timestamp: datetime
```

**`i_audit_log_repository.py`** — abstract interface:
```python
class IAuditLogRepository(ABC):
    def save(self, log: AuditLog) -> AuditLog: ...
    def list(self, filters: AuditLogFilters) -> tuple[list[AuditLog], int]: ...
```

`AuditLogFilters` dataclass fields: `user_id`, `action`, `resource_type`, `resource_id`, `date_from`, `date_to`, `page`, `page_size`.

---

### Task 2 — Application layer: DTOs + use cases

**Files to create:**
- `backend/application/dtos/audit_log_dto.py`
- `backend/application/use_cases/audit/list_audit_logs.py`

**`audit_log_dto.py`:**
```python
@dataclass
class AuditLogResponseDTO:
    id: str
    user_id: str | None
    user_name: str | None       # denormalized for display
    action: str
    resource_type: str
    resource_id: str
    payload: dict
    ip_address: str | None
    timestamp: str              # ISO 8601

@dataclass
class AuditLogListResponseDTO:
    results: list[AuditLogResponseDTO]
    count: int
    page: int
    page_size: int
```

**`list_audit_logs.py`** — `ListAuditLogsUseCase.execute(filters)` reads from repo, returns `AuditLogListResponseDTO`. No UoW needed (read-only).

---

### Task 3 — Infrastructure layer: repository implementation

**File to create:** `backend/infrastructure/repositories/django_audit_log_repository.py`

- `save()` — creates `AuditLogModel` row, returns domain entity
- `list()` — builds queryset from filters, applies `.select_related("user")` for name denormalization, returns paginated results + total count
- `_to_domain()` — maps ORM model → `AuditLog` entity

---

### Task 4 — AuditService: the write interface used everywhere

**Files to create:**
- `backend/domain/services/i_audit_service.py`
- `backend/infrastructure/services/audit_service.py`

```python
class IAuditService(ABC):
    def log(
        self,
        action: str,
        resource_type: str,
        resource_id: str,
        user_id: UUID | None = None,
        ip_address: str | None = None,
        payload: dict | None = None,
    ) -> None: ...
```

`AuditService` (concrete impl) instantiates `DjangoAuditLogRepository` directly and calls `save()`. Writes are fire-and-forget — wrap in `try/except` so audit failures never break the main request.

**Helper** — `get_audit_service() -> AuditService` factory function in `infrastructure/services/audit_service.py` for easy injection.

---

### Task 5 — DRF mixin: auto-audit on mutating views

**File to create:** `backend/interfaces/api/v1/mixins.py`

`AuditMixin` overrides DRF `finalize_response()`:

| HTTP Method | Action logged |
|---|---|
| POST | CREATE |
| PUT / PATCH | UPDATE |
| DELETE | DELETE |

```python
class AuditMixin:
    audit_resource_type: str = ""   # set on each view class

    def finalize_response(self, request, response, *args, **kwargs):
        resp = super().finalize_response(request, response, *args, **kwargs)
        if request.method in ("POST", "PUT", "PATCH", "DELETE") and resp.status_code < 400:
            action = METHOD_TO_ACTION[request.method]
            resource_id = str(kwargs.get("pk", ""))
            if action == "CREATE" and hasattr(resp, "data"):
                resource_id = str(resp.data.get("id", ""))
            get_audit_service().log(
                action=action,
                resource_type=self.audit_resource_type,
                resource_id=resource_id,
                user_id=request.user.id if request.user.is_authenticated else None,
                ip_address=_get_client_ip(request),
                payload={"method": request.method, "path": request.path},
            )
        return resp
```

Add `AuditMixin` + `audit_resource_type = "<resource>"` to every existing view class (appointments, patients, consultations, prescriptions, billing, test_orders, medicines, doctors, users).

---

### Task 6 — Login / Logout audit via Django signals

**File to create:** `backend/infrastructure/signals.py`

```python
from django.contrib.auth.signals import user_logged_in, user_logged_out

def on_login(sender, request, user, **kwargs):
    get_audit_service().log(
        action="LOGIN",
        resource_type="user",
        resource_id=str(user.id),
        user_id=user.id,
        ip_address=_get_client_ip(request),
    )

def on_logout(sender, request, user, **kwargs):
    get_audit_service().log(
        action="LOGOUT",
        resource_type="user",
        resource_id=str(user.id),
        user_id=user.id,
        ip_address=_get_client_ip(request),
    )
```

Connect in `backend/config/apps.py` `ready()` hook (or `AppConfig.ready()`).

---

### Task 7 — VIEW action logging (sensitive reads)

Not every GET should be logged — only sensitive reads. Explicitly call `get_audit_service().log(action="VIEW", ...)` inside these view methods:

- `PatientHistoryView.get()` — patient record access
- `ConsultationDetailView.get()` — consultation detail
- `PrescriptionDetailView.get()` — prescription detail
- `ReportDetailView.get()` — lab report access
- `InvoiceDetailView.get()` — billing detail

---

### Task 8 — Audit log API endpoint

**Files to create:**
- `backend/interfaces/api/v1/audit_logs/views.py`
- `backend/interfaces/api/v1/audit_logs/serializers.py`
- `backend/interfaces/api/v1/audit_logs/__init__.py`

**View:** `AuditLogListView(APIView)`
- Permission: `AdminOnly`
- Method: `GET /api/v1/audit-logs/`
- Query params: `user_id`, `action`, `resource_type`, `resource_id`, `date_from`, `date_to`, `page`, `page_size`
- Delegates to `ListAuditLogsUseCase`

**Serializer:** `AuditLogResponseSerializer` — read-only serializer for `AuditLogResponseDTO`.

**Register** in `backend/interfaces/api/v1/urls.py`:
```python
path("audit-logs/", include("interfaces.api.v1.audit_logs.urls")),
```

---

### Task 9 — UnitOfWork: add audit_logs repo

**File to update:** `backend/infrastructure/unit_of_work/django_unit_of_work.py`

Add `self.audit_logs = DjangoAuditLogRepository()` so use cases that need to write audit entries within a transaction can do so via the UoW. (AuditService uses it outside transactions; this is for cases where you want the audit write to roll back with the main operation.)

---

### Task 10 — OpenAPI schema annotation

Add `@extend_schema` decorators to `AuditLogListView` so Swagger docs include filter params and response shape.

---

## Frontend Implementation

### Task 11 — TypeScript types

**File to create:** `frontend/src/features/auditLogs/types.ts`

```typescript
export interface AuditLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "LOGIN" | "LOGOUT";
  resource_type: string;
  resource_id: string;
  payload: Record<string, unknown>;
  ip_address: string | null;
  timestamp: string;
}

export interface AuditLogListResponse {
  results: AuditLog[];
  count: number;
  page: number;
  page_size: number;
}

export interface AuditLogFilters {
  user_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}
```

---

### Task 12 — API module

**File to create:** `frontend/src/features/auditLogs/api/auditLogsApi.ts`

```typescript
export const auditLogsKeys = {
  list: (filters: AuditLogFilters) => ["audit-logs", filters] as const,
};

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: auditLogsKeys.list(filters),
    queryFn: () => apiClient.get<AuditLogListResponse>("/api/v1/audit-logs/", { params: filters }).then(r => r.data),
  });
}
```

---

### Task 13 — AuditLogsPage component

**File to create:** `frontend/src/features/auditLogs/pages/AuditLogsPage.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Audit Logs                          [Export CSV]│
├────────────┬──────────┬─────────────┬────────────┤
│ User       │ Action   │ Resource    │ Date range │  ← filter bar
├────────────┴──────────┴─────────────┴────────────┤
│ Timestamp │ User     │ Action │ Resource │ IP     │  ← table header
├───────────┼──────────┼────────┼──────────┼────────┤
│ ...rows...                                        │
├───────────────────────────────────────────────────┤
│  ← Prev   Page 1 of N   Next →                    │  ← pagination
└───────────────────────────────────────────────────┘
```

**Filter bar fields:**
- User search (text input, searches by name)
- Action dropdown (All / CREATE / UPDATE / DELETE / VIEW / LOGIN / LOGOUT)
- Resource type dropdown (All / patient / appointment / consultation / prescription / billing / test_order / user / medicine)
- Date from / Date to (date pickers)
- Reset filters button

**Table columns:**
| Column | Notes |
|---|---|
| Timestamp | Formatted as `DD MMM YYYY, HH:mm` (Asia/Dhaka) |
| User | Full name + role badge; "System" if null |
| Action | Colour-coded pill (green=CREATE, blue=UPDATE, red=DELETE, grey=VIEW, teal=LOGIN/LOGOUT) |
| Resource | `resource_type` + `resource_id` as a link if navigable |
| IP Address | Raw value |
| Details | Expand row to show `payload` JSON |

**State management:** filters in local `useState`, debounced query refresh on filter change. Pagination resets to page 1 on filter change.

---

### Task 14 — Row detail expand

Clicking a row expands an inline panel showing the full `payload` JSON formatted as a readable key-value list (not raw JSON dump). Useful for seeing exactly what changed (e.g. old/new field values if payload includes a diff).

---

### Task 15 — Export CSV

A `GET /api/v1/audit-logs/?format=csv` endpoint (or a client-side export of the current page) downloads audit log data as CSV. Add an **Export CSV** button in the page header that triggers this.

Backend addition: accept `format=csv` query param in `AuditLogListView`, return `HttpResponse` with `Content-Type: text/csv` when set.

---

### Task 16 — Route + RoleGuard

**File to update:** `frontend/src/App.tsx`

```tsx
<Route
  path="/audit-logs"
  element={
    <RoleGuard roles={["admin", "super_admin"]}>
      <AuditLogsPage />
    </RoleGuard>
  }
/>
```

---

### Task 17 — Navigation link

**File to update:** `frontend/src/shared/components/AppShell.tsx`

Add **Audit Logs** nav item visible only to `admin` and `super_admin` roles, placed at the bottom of the sidebar navigation.

---

## Implementation Order

```
Backend
  1. Domain entity + repo interface         (Task 1)
  2. DTOs + list use case                   (Task 2)
  3. Repository implementation              (Task 3)
  4. AuditService                           (Task 4)
  5. AuditMixin + wire into all views       (Task 5)
  6. Login/logout signals                   (Task 6)
  7. VIEW logging on sensitive reads        (Task 7)
  8. API endpoint                           (Task 8)
  9. UoW update                             (Task 9)
 10. OpenAPI annotations                    (Task 10)

Frontend
 11. TypeScript types                       (Task 11)
 12. API module (TanStack Query)            (Task 12)
 13. AuditLogsPage with filters + table     (Task 13)
 14. Row expand for payload detail          (Task 14)
 15. CSV export                             (Task 15)
 16. Route + RoleGuard                      (Task 16)
 17. AppShell nav link                      (Task 17)
```

---

## Out of Scope (for now)

- Real-time audit feed (WebSocket)
- Diff tracking (old vs new field values) — payload can carry this later
- Audit log retention policy / auto-purge
- Per-user audit log view (each user seeing their own activity)
