# 04 — TEST

Verify the change works end-to-end. No automated test suite yet — this is the manual verification protocol.

---

## Pre-test setup

```bash
# Ensure stack is running and migrations are applied
docker compose up -d
docker compose exec backend python manage.py migrate

# Tail logs in a separate terminal during testing
docker compose logs -f backend
```

---

## Backend API tests

### 1. Smoke test — server is alive
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8005/api/v1/schema/swagger-ui/
# Expected: 200
```

### 2. Get a JWT token
```bash
TOKEN=$(curl -s -X POST http://localhost:8005/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_user","password":"Admin1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])")
echo "Token: $TOKEN"
```

### 3. Test happy path
```bash
curl -s -X POST http://localhost:8005/api/v1/<resource>/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ <valid payload> }' | python3 -m json.tool
# Expected: 201 with correct response body
```

### 4. Test validation error
```bash
curl -s -X POST http://localhost:8005/api/v1/<resource>/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ <invalid/missing fields> }' | python3 -m json.tool
# Expected: 400 with field errors
```

### 5. Test RBAC — wrong role
```bash
# Get token for a role that should be denied (e.g. trainee)
TRAINEE_TOKEN=$(curl -s -X POST http://localhost:8005/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"trainee_user","password":"Trainee1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])")

curl -s -X POST http://localhost:8005/api/v1/<resource>/ \
  -H "Authorization: Bearer $TRAINEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ <payload> }' | python3 -m json.tool
# Expected: 403
```

### 6. Test unauthenticated
```bash
curl -s -X GET http://localhost:8005/api/v1/<resource>/ | python3 -m json.tool
# Expected: 401
```

### 7. Test domain rule violation
```bash
# e.g. slot conflict, duplicate booking, wrong status transition
curl -s -X POST http://localhost:8005/api/v1/<resource>/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ <payload that triggers business rule> }' | python3 -m json.tool
# Expected: 400 or 409 with {"error": "..."} message
```

---

## Per-feature test scenarios

### Appointments
- [ ] Book with valid slot → 201
- [ ] Book overlapping slot (same doctor, <15 min gap) → 400/409
- [ ] Walk-in → 201, token_number assigned immediately
- [ ] Check-in → status becomes `IN_QUEUE`, token assigned if null
- [ ] Follow-up creation after prescription with `follow_up_date`
- [ ] SSE stream: open `http://localhost:8005/api/v1/appointments/queue/stream/?token=<jwt>&date=<today>`

### Consultations
- [ ] Start → status `IN_PROGRESS`
- [ ] Update vitals / notes
- [ ] Complete → status `COMPLETED`
- [ ] Doctor can only update own consultation (not another doctor's) → 403
- [ ] Receptionist can only view, not update → 403

### Prescriptions
- [ ] Doctor creates → status `ACTIVE` immediately
- [ ] Assistant doctor creates → status `DRAFT`
- [ ] Doctor approves draft → status `ACTIVE`, follow-up scheduled if `follow_up_date` set
- [ ] PDF download → `application/pdf` response

### Billing
- [ ] Create invoice → status `PENDING`
- [ ] Record partial payment → status `PARTIALLY_PAID`, remaining balance correct
- [ ] Record full payment → status `PAID`
- [ ] Cancel invoice → status `CANCELLED`
- [ ] PDF download → `application/pdf` response
- [ ] Assistant cannot update invoice → 403

### Patients
- [ ] Register with BD phone number → 201, `MED-XXXXX` patient_id assigned
- [ ] Duplicate phone allowed (no 400)
- [ ] assistant_doctor cannot create new patient → 403

---

## Frontend smoke tests

Open `http://localhost:5175` and:

- [ ] Login works for `admin`, `doctor`, `receptionist` roles
- [ ] Navigation shows/hides items based on role
- [ ] New page renders without console errors
- [ ] New form submits successfully — success toast shown
- [ ] Validation errors shown inline
- [ ] 403 responses show an appropriate message (not crash)
- [ ] JWT refresh: wait for token to expire or manually clear `access_token` from localStorage → auto-refresh triggers

```bash
# Watch frontend build errors
docker compose logs -f frontend
```

---

## Log verification

After any write operation, confirm audit log entry:

```bash
# Check audit_logs table
docker compose exec backend python manage.py shell -c "
from infrastructure.orm.models.audit_log_model import AuditLogModel
logs = AuditLogModel.objects.order_by('-created_at')[:5]
for l in logs: print(l.resource, l.action, l.resource_id, l.created_at)
"
```

Check RBAC denials if testing permission scenarios:
```bash
docker compose exec backend tail -20 logs/rbac.log
```

---

## OpenAPI schema

After adding new endpoints:
```bash
docker compose exec backend python manage.py spectacular --validate
# Should output: Schema generation successful (0 warnings)
```

Open `http://localhost:8005/api/v1/schema/swagger-ui/` and verify:
- [ ] New endpoints appear
- [ ] Request/response schemas are correct
- [ ] No `{}` or `string` responses where a structured schema is expected

---

## All-clear criteria

All of the following must be true before moving to SHIP:

- [ ] Happy path returns correct status code and body
- [ ] Validation errors return 400 with descriptive messages
- [ ] RBAC denials return 403 for all roles that should be blocked
- [ ] Domain rule violations return 400/409 with `{"error": "..."}` message
- [ ] Audit log entry created for write operations
- [ ] No unexpected errors in `docker compose logs backend`
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] OpenAPI schema validates: `manage.py spectacular --validate`
- [ ] Frontend renders and interactions work without console errors
