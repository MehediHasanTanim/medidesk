# Auth & RoleGuard

## Storage
- `localStorage`: `access_token`, `refresh_token`
- Zustand: `useAuthStore` at `frontend/src/features/auth/store/authStore.ts`
  - `user: AuthUser | null`
  - `login(user, tokens)`, `logout()`
  - `canAccess(roles: UserRole[]) → boolean`

## RoleGuard
```tsx
// In App.tsx — wraps route elements
<RoleGuard roles={["doctor", "receptionist"]}>
  <AppointmentsPage />
</RoleGuard>
```
Renders `null` (or redirects) if `!canAccess(roles)`.

## Page-level visibility checks
```tsx
const { user, canAccess } = useAuthStore();
{canAccess(["receptionist", "admin"]) && <Button>Walk In</Button>}
```

## UserRole type
```typescript
// frontend/src/shared/types/auth.ts
type UserRole = "super_admin" | "admin" | "doctor" | "assistant_doctor" | "receptionist" | "assistant" | "trainee"
```

## JWT refresh flow
1. Request fails with 401
2. `apiClient` interceptor: reads `refresh_token` from localStorage
3. POST `/api/v1/auth/refresh/` with `{refresh}`
4. On success: saves new `access` (and rotated `refresh` if returned), retries original request
5. On failure: calls `logout()`, redirects to `/login`

## Login endpoint
`POST /api/v1/auth/login/` → `{access, refresh, user: AuthUser}`
