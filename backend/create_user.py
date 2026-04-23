#!/usr/bin/env python
"""
Create a MediDesk user directly in the database.

Usage:
    python create_user.py --username john --full-name "John Doe" --role doctor --password Secret123
    python create_user.py --username sa --full-name "Super Admin" --role super_admin --password Admin1234! --email sa@clinic.com

Roles: super_admin, admin, doctor, assistant_doctor, receptionist, assistant, trainee
"""

import argparse
import os
import sys
import django

# ── Bootstrap Django ──────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

# Load .env before Django reads os.environ
from dotenv import load_dotenv  # noqa: E402
load_dotenv(os.path.join(BASE_DIR, ".env"))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from infrastructure.orm.models.user_model import UserModel  # noqa: E402

VALID_ROLES = [c[0] for c in UserModel.ROLE_CHOICES]

# ── CLI ───────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="Create a MediDesk user")
parser.add_argument("--username",  required=True,  help="Login username (unique)")
parser.add_argument("--full-name", required=True,  help="Display name")
parser.add_argument("--password",  required=True,  help="Password")
parser.add_argument("--role",      required=True,  choices=VALID_ROLES, help=f"Role: {', '.join(VALID_ROLES)}")
parser.add_argument("--email",     default="",     help="Email address (optional)")
parser.add_argument("--inactive",  action="store_true", help="Create as inactive")

args = parser.parse_args()

# ── Create user ───────────────────────────────────────────────────────────────
if UserModel.objects.filter(username=args.username).exists():
    print(f"Error: username '{args.username}' already exists.")
    sys.exit(1)

user = UserModel.objects.create_user(
    username=args.username,
    password=args.password,
    email=args.email,
    full_name=args.full_name,
    role=args.role,
    is_active=not args.inactive,
)

if args.role in ("super_admin", "admin"):
    user.is_staff = True
    user.is_superuser = (args.role == "super_admin")
    user.save()

print(f"User created successfully:")
print(f"  ID       : {user.id}")
print(f"  Username : {user.username}")
print(f"  Full name: {user.full_name}")
print(f"  Email    : {user.email or '—'}")
print(f"  Role     : {user.role}")
print(f"  Active   : {user.is_active}")
