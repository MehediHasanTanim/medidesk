import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("medidesk")

# Read config from Django settings, namespace all Celery keys with CELERY_
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in any installed app's tasks.py
app.autodiscover_tasks()
