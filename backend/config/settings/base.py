from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = "q(*ebsqx_l1n-edj5uyo6xtfar_4qb#%@mm91vm!fd3v6m(ppb"

DEBUG = False
ALLOWED_HOSTS: list[str] = []

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    # Local — infrastructure is the only Django app (all ORM models live here)
    "infrastructure",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

AUTH_USER_MODEL = "infrastructure.UserModel"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Dhaka"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── Django REST Framework ──────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# ── drf-spectacular (OpenAPI 3 / Swagger) ─────────────────────────────────────
SPECTACULAR_SETTINGS = {
    "TITLE": "MediDesk API",
    "DESCRIPTION": (
        "REST API for MediDesk — a clinic management system for Bangladesh private consultancy practices.\n\n"
        "## Authentication\n"
        "All protected endpoints require a JWT Bearer token.\n"
        "Obtain a token via `POST /api/v1/auth/login/`, then pass it as:\n"
        "```\nAuthorization: Bearer <access_token>\n```\n\n"
        "## Roles\n"
        "| Role | Description |\n"
        "|---|---|\n"
        "| `super_admin` | Full access, Django superuser |\n"
        "| `admin` | Full access, manage staff & chambers |\n"
        "| `doctor` | Prescriptions, consultations, patients |\n"
        "| `assistant_doctor` | Prescriptions (require approval), consultations |\n"
        "| `receptionist` | Appointments, billing, patient registration |\n"
        "| `assistant` | Read-only patient & appointment access |"
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SWAGGER_UI_SETTINGS": {
        "persistAuthorization": True,
        "displayRequestDuration": True,
        "filter": True,
    },
    "COMPONENT_SPLIT_REQUEST": True,
    "SORT_OPERATIONS": False,
    "TAGS": [
        {"name": "auth",          "description": "Login, refresh, logout, profile"},
        {"name": "users",         "description": "Staff account management (admin+)"},
        {"name": "chambers",      "description": "Clinic branches and consultation rooms"},
        {"name": "patients",      "description": "Patient registration and search"},
        {"name": "appointments",  "description": "Appointment booking and live queue"},
        {"name": "consultations", "description": "Consultation lifecycle"},
        {"name": "prescriptions", "description": "Prescription management"},
        {"name": "billing",       "description": "Invoices and payment recording"},
        {"name": "medicines",     "description": "Medicine catalogue search"},
    ],
}

# ── JWT ────────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ── Celery ────────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = "redis://redis:6379/0"
CELERY_RESULT_BACKEND = "redis://redis:6379/1"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Asia/Dhaka"

# ── Logging ───────────────────────────────────────────────────────────────────
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{asctime} {levelname} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "django_file": {
            "class": "logging.handlers.TimedRotatingFileHandler",
            "filename": LOGS_DIR / "django.log",
            "when": "midnight",
            "backupCount": 14,
            "formatter": "verbose",
            "encoding": "utf-8",
        },
        "app_file": {
            "class": "logging.handlers.TimedRotatingFileHandler",
            "filename": LOGS_DIR / "app.log",
            "when": "midnight",
            "backupCount": 14,
            "formatter": "verbose",
            "encoding": "utf-8",
        },
        "rbac_file": {
            "class": "logging.handlers.TimedRotatingFileHandler",
            "filename": LOGS_DIR / "rbac.log",
            "when": "midnight",
            "backupCount": 30,
            "formatter": "verbose",
            "encoding": "utf-8",
        },
    },
    "loggers": {
        "medidesk.rbac": {
            "handlers": ["console", "rbac_file"],
            "level": "WARNING",
            "propagate": False,
        },
        "django": {
            "handlers": ["console", "django_file"],
            "level": "INFO",
            "propagate": False,
        },
        # Captures all application.* and infrastructure.* module loggers
        "application": {
            "handlers": ["console", "app_file"],
            "level": "DEBUG",
            "propagate": False,
        },
        "infrastructure": {
            "handlers": ["console", "app_file"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}

# ── CORS ───────────────────────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
]
