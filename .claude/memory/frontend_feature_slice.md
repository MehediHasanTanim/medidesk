# Frontend Feature-Slice Structure

## Folder layout
```
frontend/src/features/{feature}/
    pages/          {Feature}Page.tsx          (route component)
    api/            {feature}Api.ts            (TanStack Query hooks + Axios calls)
    components/     {ComponentName}.tsx        (feature-local only)
    hooks/          use{HookName}.ts           (feature-local hooks)
    types.ts                                   (feature-local TypeScript types)
```

## Existing features
`appointments`, `auditLogs`, `auth`, `billing`, `chambers`, `consultations`, `dashboard`, `doctors`, `medicines`, `patients`, `prescriptions`, `reports`, `testOrders`, `users`

## Shared
```
frontend/src/shared/
    components/     AppShell.tsx, RoleGuard.tsx, Toast.tsx, MapPicker.tsx
    lib/            apiClient.ts, queryClient.ts
    types/          auth.ts  (UserRole, AuthUser, ROLE_LABELS, ROLE_COLORS, ALL_ROLES)
    styles/         theme.ts  (design tokens)
```

## Naming rules
| Concern | Pattern |
|---|---|
| Feature folder | camelCase (`testOrders`, `auditLogs`) |
| Page component | `{Feature}Page.tsx` |
| API module | `{feature}Api.ts` |
| Zustand store | `{feature}Store.ts` |
| Shared component | PascalCase `.tsx` |
| Custom hook | `use{HookName}` |
| TypeScript types | PascalCase |

## Routes
Defined in `frontend/src/App.tsx`. Protected by `<RoleGuard roles={[...]}>` per route.
