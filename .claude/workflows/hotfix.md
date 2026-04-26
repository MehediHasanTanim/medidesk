# Hotfix — Fast Path

For urgent production bugs. Skip the full plan/build cycle but never skip review and test.

---

## When to use this workflow

- Production 500 error affecting users right now
- Data corruption or wrong calculation being returned
- Security issue (unauthorized access, data leak)
- Critical UI blocker (login broken, key page crashes)

**Not a hotfix:** a feature that's missing, a UI polish issue, a non-critical bug.

---

## Step 1 — Diagnose (5 min max)

```bash
# Check backend logs
docker compose logs --tail=100 backend | grep -E "ERROR|CRITICAL|500"
docker compose logs --tail=100 backend | grep -E "Traceback|Exception"

# Check RBAC denials (unexpected 403s)
docker compose exec backend tail -50 logs/rbac.log

# Check app errors
docker compose exec backend tail -50 logs/app.log

# Test the broken endpoint directly
curl -s -X GET http://localhost:8005/api/v1/<endpoint>/ \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Identify:
- [ ] Which endpoint is failing?
- [ ] Which layer is the error in? (view / use case / repo / domain)
- [ ] What is the exact traceback?

---

## Step 2 — Fix (minimal, surgical)

Fix only what is broken. Do NOT:
- Refactor surrounding code
- Add features while in the hotfix
- Change unrelated tests or config

Layer shortcuts for common issues:

| Symptom | Likely fix location |
|---|---|
| `AttributeError` on ORM object | `_to_domain()` in repo — missing field mapping |
| `KeyError` / `TypeError` in serializer | `serializers.py` — wrong field name or type |
| 403 on valid role | `ROLE_PERMISSIONS` matrix or wrong `ModulePermission` action |
| `ValueError` from use case | domain entity method — wrong precondition check |
| Migration error on startup | `infrastructure/migrations/` — conflict or missing dependency |
| Frontend crash / blank page | `App.tsx` route or `RoleGuard` roles list |
| Type error in frontend | TS type mismatch between API response and TypeScript interface |

---

## Step 3 — Review (condensed — 5 min)

- [ ] No new architecture violations introduced
- [ ] Fix is isolated — no collateral changes
- [ ] No debug prints left in
- [ ] TypeScript still compiles: `cd frontend && npx tsc --noEmit`

---

## Step 4 — Test (condensed)

```bash
# Reproduce the bug first (confirm it exists)
# Apply fix
# Confirm the bug is gone
curl -s ... # original failing request now works

# Confirm nothing adjacent broke
curl -s ... # at least one other related endpoint still works
```

---

## Step 5 — Ship immediately

```bash
git add <specific files only>

git commit -m "$(cat <<'EOF'
fix(<scope>): <one-line description of what was broken and how fixed>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"

git push origin main

# Deploy to production without waiting
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend \
  python manage.py migrate --no-input
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Verify fix in production
curl -s -o /dev/null -w "%{http_code}" https://<domain>/api/v1/<endpoint>/
```

---

## Post-hotfix

After the immediate fire is out:
- [ ] Write up what caused the bug (one sentence)
- [ ] Add the failure mode to `.claude/memory/mistakes.md`
- [ ] Schedule a proper fix if the hotfix was a workaround
