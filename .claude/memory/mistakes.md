# Mistakes to Avoid

## Architecture violations
- **ORM query outside infrastructure/**: `Model.objects.*` in a view or use case. Always add a method to the repository interface + implementation instead.
- **Business logic in views**: validation of domain rules (e.g. "slot conflict") belongs in the use case, not the view.
- **UoW used without `with` block**: never call `uow.repo.method()` without entering the context manager first.
- **Notification inside transaction**: sending WhatsApp/email inside `with self._uow:` blocks the transaction and can cause timeouts. Always call notifications after the `with` block.

## RBAC mistakes
- **Forgetting `action=` override on custom POST endpoints**: `/complete/`, `/approve/`, `/check-in/` are semantically updates but HTTP POST. Must use `ModulePermission("consultations", action="update")` or the check treats them as `create`.
- **Listing admin roles in ROLE_PERMISSIONS**: admin/super_admin bypass all ModulePermission checks automatically — adding them to the matrix is redundant and confusing.
- **Receptionist vs assistant confusion**: assistant cannot do `billing.update` and cannot change appointment status. Receptionist can.

## Frontend mistakes
- **Creating new QueryClient instances**: always import from `@/shared/lib/queryClient`, never `new QueryClient()` in a component.
- **Accessing user role from API response instead of Zustand**: role-based UI visibility uses `useAuthStore().canAccess([...])`, not request-level checks.
- **SSE with Authorization header**: `EventSource` can't set headers — JWT must be passed as `?token=` query param, handled by `QueryParamJWTAuthentication` on the backend.

## Django / DRF pitfalls
- **Missing `@extend_schema` on new views**: drf-spectacular generates Swagger docs automatically, but custom action endpoints need explicit `@extend_schema` for accurate docs.
- **Forgetting `close_old_connections()` in SSE generator**: long-lived streaming responses need this before each DB query to prevent stale connection errors.
- **`app_label` missing on new ORM models**: every model must have `app_label = "infrastructure"` in its `Meta` class, or migrations will go to the wrong app.

## Data / DB mistakes
- **Storing local time instead of UTC**: always store UTC, convert to `Asia/Dhaka` at display time.
- **Slot conflict check skipped for follow-ups**: intentional — follow-up creation must never fail silently during prescription save. Do NOT add conflict check there.
- **Token assignment**: `token_number` is `null` for regular appointments (assigned at check-in); walk-in assigns token immediately via `WalkInAppointmentUseCase`.
