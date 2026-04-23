#!/usr/bin/env python
"""
Seed all sample / dev users into the database.

Safe to run multiple times — existing usernames are skipped.

Usage:
    python seed_users.py
"""

import os
import sys
import django

# ── Bootstrap Django ──────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from dotenv import load_dotenv  # noqa: E402
load_dotenv(os.path.join(BASE_DIR, ".env"))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from infrastructure.orm.models.user_model import UserModel  # noqa: E402

# ── Sample users ──────────────────────────────────────────────────────────────

import uuid

SAMPLE_USERS = [
    {
        "id":        "2b77eed2-fa1f-435c-9c4a-f984ceeac56a",
        "username":  "super_admin_user",
        "full_name": "Super Admin User",
        "email":     "super_admin@medidesk.com",
        "role":      "super_admin",
        "password":  "SuperAdmin1234!",
        "is_staff":       True,
        "is_superuser":   True,
    },
    {
        "id":        "8ddcd41f-b6e2-440c-90e4-ab4c0ad2924c",
        "username":  "admin_user",
        "full_name": "Admin User",
        "email":     "admin_user@medidesk.com",
        "role":      "admin",
        "password":  "Admin1234!",
        "is_staff":       True,
        "is_superuser":   False,
    },
    {
        "id":        "867d6b9c-7070-4b41-b9b3-fafba220ebfd",
        "username":  "dr_rahman",
        "full_name": "Dr. Rahman",
        "email":     "dr.rahman@medidesk.com",
        "role":      "doctor",
        "password":  "Doctor1234!",
        "is_staff":       False,
        "is_superuser":   False,
    },
    {
        "id":              "a3b4fc99-e237-4b5c-bac8-d636b8a8e023",
        "username":        "dr_karim",
        "full_name":       "Dr. Karim",
        "email":           "dr.karim@medidesk.com",
        "role":            "assistant_doctor",
        "password":        "AsstDoc1234!",
        "is_staff":        False,
        "is_superuser":    False,
        "supervisor_username": "dr_rahman",
    },
    {
        "id":        "1829996d-b6ac-4260-8080-139719a6a37b",
        "username":  "fatima_reception",
        "full_name": "Fatima Begum",
        "email":     "fatima@medidesk.com",
        "role":      "receptionist",
        "password":  "Recept1234!",
        "is_staff":       False,
        "is_superuser":   False,
    },
    {
        "id":        "828de1cb-d422-475b-a6da-86a98c6fa23f",
        "username":  "rahim_assist",
        "full_name": "Rahim Mia",
        "email":     "rahim@medidesk.com",
        "role":      "assistant",
        "password":  "Assist1234!",
        "is_staff":       False,
        "is_superuser":   False,
    },
]

# ── Run ───────────────────────────────────────────────────────────────────────

created = 0
skipped = 0

for u in SAMPLE_USERS:
    if UserModel.objects.filter(username=u["username"]).exists():
        print(f"  SKIP  {u['username']} (already exists)")
        skipped += 1
        continue

    user = UserModel.objects.create_user(
        id=uuid.UUID(u["id"]),
        username=u["username"],
        password=u["password"],
        email=u["email"],
        full_name=u["full_name"],
        role=u["role"],
        is_active=True,
    )
    if u.get("is_staff") or u.get("is_superuser"):
        user.is_staff = u["is_staff"]
        user.is_superuser = u["is_superuser"]
        user.save()

    print(f"  OK    {user.username:25s}  id={user.id}  role={user.role}")
    created += 1

# Wire up supervisor relationships
for u in SAMPLE_USERS:
    sup_username = u.get("supervisor_username")
    if not sup_username:
        continue
    try:
        asst = UserModel.objects.get(username=u["username"])
        supervisor = UserModel.objects.get(username=sup_username)
        if asst.supervisor_id != supervisor.id:
            asst.supervisor = supervisor
            asst.save(update_fields=["supervisor"])
            print(f"  LINK  {u['username']} → supervisor: {sup_username}")
    except UserModel.DoesNotExist:
        print(f"  WARN  Could not link supervisor for {u['username']}")

print(f"\nDone — {created} created, {skipped} skipped.")
