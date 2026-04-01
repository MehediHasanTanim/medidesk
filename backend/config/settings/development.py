from config.settings.base import *  # noqa: F401, F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

import os

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("DB_NAME", "medidesk_dev"),
        "USER": os.environ.get("DB_USER", "postgres"),
        "PASSWORD": os.environ.get("DB_PASSWORD", ""),
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "5432"),
    }
}

# Print emails to console in dev
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Relax CORS in development
CORS_ALLOW_ALL_ORIGINS = True

# Run Celery tasks synchronously (no Redis needed in dev)
CELERY_TASK_ALWAYS_EAGER = True
