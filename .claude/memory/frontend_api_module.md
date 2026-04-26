# Frontend API Module Pattern

## File: `frontend/src/features/{feature}/api/{feature}Api.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/shared/lib/apiClient";

// Types
export interface Appointment { id: string; patient_name: string; ... }

// Query keys
const KEYS = {
  list: (filters?: object) => ["appointments", filters] as const,
  detail: (id: string) => ["appointments", id] as const,
};

// List query
export function useAppointments(filters?: AppointmentFilters) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: () => apiClient.get<Appointment[]>("/appointments/", { params: filters }).then(r => r.data),
  });
}

// Mutation with cache invalidation
export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BookAppointmentPayload) =>
      apiClient.post<Appointment>("/appointments/", payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}
```

## `apiClient`
File: `frontend/src/shared/lib/apiClient.ts`
- `baseURL: "/api/v1"` (Vite proxies to `localhost:8005`)
- Attaches `Authorization: Bearer <access_token>` from `localStorage`
- Auto-refreshes on 401 → retries original request → on failure, calls `useAuthStore.getState().logout()` and redirects to `/login`
- Rotated refresh token saved back to `localStorage` after each successful refresh

## queryClient
File: `frontend/src/shared/lib/queryClient.ts`
Shared `QueryClient` instance — import from here, never create new ones.

## Toast pattern
```typescript
import { useToast } from "@/shared/components/Toast";
const { showToast } = useToast();
showToast("Appointment booked", "success");
showToast("Something went wrong", "error");
```
