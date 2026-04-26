# Migration Workflow

Safe checklist for every database schema change.

---

## Rule: migrations go in, they don't come out

Never delete a migration once it has been applied anywhere (dev or prod). Squash only if absolutely necessary and only before the first production deploy of those migrations.

---

## Creating a migration

### 1. Make the model change
Edit `backend/infrastructure/orm/models/<entity>_model.py`.

Always verify:
- `app_label = "infrastructure"` present in `Meta`
- `db_table` set explicitly

### 2. Generate the migration
```bash
docker compose exec backend python manage.py makemigrations
# or with a descriptive name:
docker compose exec backend python manage.py makemigrations infrastructure --name <describe_change>
```

Example names:
```
add_follow_up_date_to_prescriptions
remove_unique_constraint_patient_phone
add_supervisor_id_to_users
create_audit_logs_table
```

### 3. Review the generated file
```bash
cat backend/infrastructure/migrations/0XXX_<name>.py
```

Check:
- [ ] Only the intended change is in the migration
- [ ] No accidental field removals
- [ ] `dependencies` list is correct (points to the previous migration)
- [ ] For `RemoveField` or `AlterField` — confirm this is intentional

### 4. Apply locally
```bash
docker compose exec backend python manage.py migrate
```

### 5. Verify
```bash
# Check migration state
docker compose exec backend python manage.py showmigrations infrastructure | tail -10

# Quick table check
docker compose exec db psql -U postgres -d medidesk_dev -c "\d <table_name>"
```

---

## Risky migration patterns

### Adding a NOT NULL column to an existing table

**Problem:** migration fails if table has existing rows.

**Solution:** always provide a `default=` or make it nullable first, then backfill.

```python
# Step 1 — nullable
field = models.CharField(max_length=20, null=True, blank=True)

# Step 2 — after backfill
field = models.CharField(max_length=20, default="value")
# Then remove null=True in a follow-up migration
```

### Removing a column

```python
# 1. First deploy: stop using the column in code (but keep the field in model)
# 2. Second deploy: remove the field and create migration
# Avoids 500s if old code is still running during rolling deploy
```

### Renaming a column

**Never use `RenameField` in production without a transition period.** Instead:
1. Add new column
2. Write data migration to copy values
3. Update code to use new column
4. Drop old column in a later migration

### Changing a field type

```python
# Use AlterField — Django generates this automatically from makemigrations
# Always test locally with real data volume before deploying
```

---

## Data migrations (migrating existing data)

When a schema change requires transforming existing data:

```python
# In the migration file, after schema operations:
from django.db import migrations

def backfill_status(apps, schema_editor):
    MyModel = apps.get_model("infrastructure", "MyModel")
    MyModel.objects.filter(old_field=None).update(new_field="default_value")

class Migration(migrations.Migration):
    dependencies = [...]
    operations = [
        migrations.AddField(...),
        migrations.RunPython(backfill_status, migrations.RunPython.noop),
    ]
```

---

## Production migration checklist

- [ ] Migration reviewed (only intended changes)
- [ ] Migration applied and tested locally
- [ ] No NOT NULL columns without defaults on tables with existing data
- [ ] Migration committed and pushed before deploying

```bash
# Deploy order — ALWAYS migrate before restarting app
docker compose exec backend python manage.py migrate --no-input
# THEN restart
docker compose up -d --build
```

If migration fails in production:
```bash
# Check which migrations are applied
docker compose exec backend python manage.py showmigrations infrastructure

# Roll back the specific migration
docker compose exec backend python manage.py migrate infrastructure <previous_migration_number>
# e.g.: migrate infrastructure 0014
```
