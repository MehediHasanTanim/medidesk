# 03 — REVIEW

Self-review checklist before committing. Catch issues that tests don't.

---

## Architecture integrity

- [ ] No `from django.*` or `import django` in `domain/` or `application/`
- [ ] No `Model.objects.*` calls outside `infrastructure/repositories/`
- [ ] No business logic in views (rule enforcement belongs in use case or domain entity)
- [ ] No raw ORM queries in use cases (go through repo methods)
- [ ] Every multi-step write is inside `with self._uow:` — no bare repo calls
- [ ] Notifications and async tasks are outside the `with self._uow:` block

---

## Domain layer

- [ ] New entities are `@dataclass` with no framework imports
- [ ] Status transitions are methods on the entity, not in use cases or views
- [ ] Value objects used: `Money(amount, "BDT")`, `PhoneNumber` for BD phones
- [ ] New repo interface method added to the ABC before implementing it

---

## Infrastructure layer

- [ ] Every ORM model has `app_label = "infrastructure"` in `Meta`
- [ ] Every ORM model has `db_table` set explicitly
- [ ] `_to_domain()` static method present on every repository
- [ ] `_to_domain()` returns a pure domain entity (no ORM object escapes)
- [ ] Migration file created for every model change
- [ ] Migration applied: `docker compose exec backend python manage.py migrate`

---

## Application layer

- [ ] Use case `__init__` receives only interfaces (`IUnitOfWork`, `INotificationService`)
- [ ] DTOs are `@dataclass` with primitive fields (str, int, Decimal — not ORM objects)
- [ ] UUID string fields converted with `uuid.UUID()` before passing to repo methods
- [ ] `ValueError` raised for domain rule violations (views catch → 400/409)

---

## Interface layer (views / serializers)

- [ ] Every view method has `@extend_schema` with `request=` and `responses=`
- [ ] Permission classes set: at minimum `[IsAuthenticated, ModulePermission("<module>")]`
- [ ] Action-style POST endpoints use `ModulePermission("<module>", action="update")`
- [ ] `ConsultationOwnershipMixin.check_consultation_scope()` called on all clinical write views
- [ ] `ReceptionistChamberScopeMixin.check_chamber_scope()` called on appointment views
- [ ] `AuditMixin.log_audit()` called after every successful write
- [ ] New URL registered in both feature `urls.py` and `interfaces/api/v1/urls.py`
- [ ] New factory method added to `Container` for every new use case

---

## RBAC

- [ ] New module added to `ROLE_PERMISSIONS` for all applicable roles
- [ ] `admin` / `super_admin` NOT listed in `ROLE_PERMISSIONS` (they bypass automatically)
- [ ] `assistant` vs `receptionist` distinction respected (assistant has no `billing.update`)
- [ ] `trainee` entries are view-only or empty set

---

## Frontend

- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm run lint` passes with no warnings
- [ ] No `new QueryClient()` in components — always import from `@/shared/lib/queryClient`
- [ ] Role checks use `canAccess([...])` from `useAuthStore`, not hardcoded strings
- [ ] Mutations call `qc.invalidateQueries(...)` on success
- [ ] Error path shows `showToast("...", "error")` — never silently swallows errors
- [ ] New page added to `App.tsx` wrapped in `<RoleGuard roles={[...]}>`
- [ ] New top-level page added to AppShell nav (with role visibility check if needed)

---

## BD-specific

- [ ] All monetary values use `Money(amount, "BDT")` — no raw `Decimal` without currency
- [ ] All timestamps stored UTC — no `now()` in BD timezone saved to DB
- [ ] Phone validation uses `PhoneNumber` value object — no raw string regex in views
- [ ] Payment method values are one of: `CASH | BKASH | NAGAD | CARD`

---

## Final checks

```bash
# 1. TypeScript
cd frontend && npx tsc --noEmit

# 2. ESLint
cd frontend && npm run lint

# 3. OpenAPI schema validity
docker compose exec backend python manage.py spectacular --validate

# 4. Migrations are up to date
docker compose exec backend python manage.py makemigrations --check

# 5. Git diff — no debug prints, no TODO left uncommitted without a note
git diff --stat
git diff | grep -E "print\(|console\.log\(|pdb\.|breakpoint\(" 
```

If all green → proceed to TEST.
