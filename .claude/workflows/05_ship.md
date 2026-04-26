# 05 — SHIP

Commit, push, and optionally deploy. Only run this after REVIEW and TEST both pass.

---

## Pre-ship checklist

- [ ] `REVIEW` checklist complete — no architecture violations
- [ ] `TEST` all-clear criteria met
- [ ] No debug prints or `console.log` left in code
- [ ] No uncommitted migration files
- [ ] `.env` and secrets NOT staged

```bash
# Verify no debug artifacts
git diff --cached | grep -E "print\(|console\.log\(|pdb\.|breakpoint\("

# Verify no .env staged
git status | grep ".env"

# Verify migrations committed
git status | grep migrations
```

---

## Commit

### 1. Stage files — specific, never `git add .`

```bash
# Backend changes
git add backend/domain/
git add backend/application/
git add backend/infrastructure/
git add backend/interfaces/

# Frontend changes
git add frontend/src/

# Config / infra
git add docker-compose.yml backend/config/ .gitignore
```

### 2. Commit message format

Follow the existing convention: `type(scope): short description — detail`

```
feat(appointments): walk-in queue shortcut with immediate token assignment
feat(billing): invoice PDF generation and income report
fix(prescriptions): normalise empty dosage slots to "0"
chore(deps): bump weasyprint to 62.0
refactor(rbac): extract ConsultationOwnershipMixin to permissions.py
```

Types: `feat` · `fix` · `refactor` · `chore` · `docs` · `test`

Scope: module name — `appointments` · `billing` · `prescriptions` · `patients` · `auth` · `rbac` · `infra`

### 3. Create the commit

```bash
git commit -m "$(cat <<'EOF'
feat(<scope>): <short description>

- <what changed in layer 1>
- <what changed in layer 2>
- <any noteworthy decision or tradeoff>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Push

```bash
git push origin main
```

Verify on remote:
```bash
git log --oneline -5
```

---

## Deploy (production)

Only run if deploying to production server.

### 1. Pull on server
```bash
git pull origin main
```

### 2. Apply migrations (BEFORE restarting app)
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend \
  python manage.py migrate --no-input
```

### 3. Collect static files (if static files changed)
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend \
  python manage.py collectstatic --no-input
```

### 4. Restart services
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 5. Verify production health
```bash
# Backend alive
curl -s -o /dev/null -w "%{http_code}" https://<domain>/api/v1/schema/swagger-ui/
# Expected: 200

# Check for startup errors
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=50 backend
```

### 6. Smoke test critical flows
- [ ] Login → JWT returned
- [ ] At least one authenticated API call succeeds
- [ ] No 500s in logs

---

## Rollback (if needed)

```bash
# Revert to previous commit
git revert HEAD --no-edit
git push origin main

# On server — revert migrations if schema changed
docker compose exec backend python manage.py migrate <app> <previous_migration_number>
# e.g.: python manage.py migrate infrastructure 0012

# Restart
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## Post-ship

- [ ] Confirm no errors in backend/frontend logs for ~5 minutes after deploy
- [ ] Update `.claude/memory/` if any significant architectural decision was made
- [ ] Update `.claude/workflows/` if a new workflow pattern emerged
- [ ] Close any related task or plan document
