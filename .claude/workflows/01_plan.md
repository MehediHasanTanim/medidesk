# 01 — PLAN

Understand the requirement, find where it touches the codebase, and design before writing a single line.

---

## Step 1 — Understand the requirement

Answer these before doing anything else:

- [ ] What is the user-visible outcome? (one sentence)
- [ ] Which roles can trigger this? (`doctor`, `receptionist`, `admin`, …)
- [ ] Is this a new resource, a new action on an existing resource, or a workflow change?
- [ ] Does it touch billing / prescriptions / appointments / consultations — or something new?
- [ ] Are there BD-specific constraints? (currency BDT, phone format, WhatsApp required?)

---

## Step 2 — Locate the impact zone

Run these to find what already exists:

```bash
# Find related domain entity
grep -r "class <Entity>" backend/domain/

# Find related use cases
ls backend/application/use_cases/<entity>/

# Find related ORM model
grep -r "class <Entity>Model" backend/infrastructure/orm/models/

# Find related API views
ls backend/interfaces/api/v1/<entity>/

# Find related frontend feature
ls frontend/src/features/<feature>/
```

---

## Step 3 — Identify the layer touches

For each layer, decide: **new file**, **extend existing**, or **no change needed**.

| Layer | File(s) | Change type |
|---|---|---|
| Domain entity | `domain/entities/<entity>.py` | new field / new method / new entity |
| Domain repo interface | `domain/repositories/i_<entity>_repository.py` | new abstract method |
| Use case | `application/use_cases/<entity>/<verb>_<entity>.py` | new file / extend |
| Request/Response DTO | `application/dtos/<entity>_dto.py` | new dataclass |
| ORM model | `infrastructure/orm/models/<entity>_model.py` | new field → migration |
| Repo implementation | `infrastructure/repositories/django_<entity>_repository.py` | implement new method |
| UoW | `infrastructure/unit_of_work/django_unit_of_work.py` | only if new repo |
| Container | `interfaces/api/container.py` | new factory method |
| View + serializer | `interfaces/api/v1/<entity>/views.py` + `serializers.py` | new view or method |
| URL | `interfaces/api/v1/<entity>/urls.py` + `interfaces/api/v1/urls.py` | new route |
| Frontend API module | `frontend/src/features/<feature>/api/<feature>Api.ts` | new query/mutation |
| Frontend page/component | `frontend/src/features/<feature>/pages/<Feature>Page.tsx` | new UI |
| RBAC matrix | `interfaces/permissions.py` → `ROLE_PERMISSIONS` | only if new module |

---

## Step 4 — Design the API contract

Before writing backend code, nail down the HTTP contract:

```
Method + URL:    POST /api/v1/<resource>/<id>/<action>/
Request body:    { field: type, ... }
Response body:   { id, status, ... }
HTTP success:    201 | 200
HTTP errors:     400 (validation), 403 (RBAC), 404 (not found), 409 (conflict)
Permission:      IsAuthenticated + ModulePermission("<module>", action="<action>")
```

---

## Step 5 — Spot risks

- [ ] Does this require a DB migration? (new field, new table, constraint change)
- [ ] Does it add a new notification side effect? (must be outside UoW transaction)
- [ ] Does it change an existing status machine? (Appointment / Prescription / Invoice)
- [ ] Does it add a new Celery task? (needs `CELERY_TASK_ALWAYS_EAGER = True` in tests)
- [ ] Does it touch SSE / streaming? (needs `QueryParamJWTAuthentication`, `close_old_connections()`)
- [ ] Does it generate a PDF? (WeasyPrint, must return `HttpResponse` with `application/pdf`)

---

## Step 6 — Write the plan

Output a numbered list:
1. Domain changes (entity, value object, repo interface)
2. Infrastructure changes (ORM model → migration, repo implementation)
3. Application changes (use case, DTOs)
4. Interface changes (view, serializer, URL, Container)
5. Frontend changes (api module, page/component)
6. RBAC changes (permissions matrix, new permission class if needed)
7. Test scenarios (happy path + key edge cases)

**Only proceed to BUILD once this plan is agreed.**
