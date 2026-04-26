# MediDesk — Project Memory Index

Long-term intelligence for Claude. High-signal only: patterns that worked, repeated mistakes, key learnings.

## Architecture & Patterns
- [Clean Architecture Boundaries](arch_clean_architecture.md) — Layer rules, what belongs where, what is a violation
- [Use Case Pattern](arch_use_case_pattern.md) — Canonical skeleton, UoW lifecycle, notification placement
- [Repository Pattern](arch_repository_pattern.md) — Interface + implementation conventions, `_to_domain()`, UoW wiring
- [DjangoUnitOfWork](arch_unit_of_work.md) — How the UoW works, commit/rollback, adding new repos

## Backend
- [RBAC & Permissions](backend_rbac.md) — `ModulePermission`, `RolePermission`, ownership mixins, ROLE_PERMISSIONS matrix
- [API View Pattern](backend_api_views.md) — DRF view skeleton, serializer-only validation, container injection, AuditMixin
- [SSE / Streaming Pattern](backend_sse.md) — `StreamingHttpResponse`, `QueryParamJWTAuthentication`, heartbeat + reconnect design
- [PDF Generation](backend_pdf.md) — WeasyPrint pattern used for prescriptions and invoices
- [Audit Log System](backend_audit.md) — `AuditMixin`, what gets logged, how to add audit to a new view

## Frontend
- [Feature-Slice Structure](frontend_feature_slice.md) — Folder layout, naming, what goes where
- [API Module Pattern](frontend_api_module.md) — TanStack Query hooks, Axios apiClient, mutation + invalidation
- [Auth & RoleGuard](frontend_auth.md) — JWT flow, `useAuthStore`, `canAccess()`, `RoleGuard` usage
- [SSE Hook Pattern](frontend_sse_hook.md) — `useQueueSSE` design: EventSource, sseStatus states, polling fallback

## Domain & Data
- [Domain Entities](domain_entities.md) — Key entities, status enums, lifecycle transitions
- [BD-Specific Constraints](domain_bd_constraints.md) — Phone format, currency, timezone, patient ID, payment methods
- [ORM Models Map](domain_orm_map.md) — Table → ORM model → domain entity quick reference

## Mistakes & Lessons
- [Mistakes to Avoid](mistakes.md) — Recurring errors caught in this project
