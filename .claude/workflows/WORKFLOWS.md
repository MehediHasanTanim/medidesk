# MediDesk — Workflows

Automation layer for the full development lifecycle.
Each workflow is a complete, executable checklist grounded in this codebase.

## Flows

| File | When to use |
|---|---|
| [01_plan.md](01_plan.md) | Before writing any code — understand, scope, design |
| [02_build.md](02_build.md) | Implementing a feature — layer-by-layer build order |
| [03_review.md](03_review.md) | Before committing — self-review checklist |
| [04_test.md](04_test.md) | Verifying a change works end-to-end |
| [05_ship.md](05_ship.md) | Committing, pushing, and deploying |

## Support files

| File | Purpose |
|---|---|
| [new_feature_scaffold.md](new_feature_scaffold.md) | Copy-paste skeleton for a complete new feature |
| [hotfix.md](hotfix.md) | Fast path for urgent production fixes |
| [migration_workflow.md](migration_workflow.md) | Safe DB migration checklist |

## Standard flow order

```
PLAN → BUILD → REVIEW → TEST → SHIP
  ↑                              |
  └──────── iterate if needed ───┘
```

## Quick commands reference

```bash
# Start dev stack
docker compose up

# Backend shell
docker compose exec backend python manage.py shell

# Make + run migrations
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate

# TypeScript check
cd frontend && npx tsc --noEmit

# Frontend lint
cd frontend && npm run lint

# Swagger schema validate
docker compose exec backend python manage.py spectacular --validate

# Tail backend logs
docker compose logs -f backend

# Tail RBAC denials
docker compose exec backend tail -f logs/rbac.log
```
