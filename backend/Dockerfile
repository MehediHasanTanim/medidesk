# ── Base ──────────────────────────────────────────────────────────────────────
FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps: psycopg2, weasyprint (pango/cairo), Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev \
        gcc \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libcairo2 \
        libgdk-pixbuf-2.0-0 \
        libffi-dev \
        shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY . .

ENTRYPOINT ["/entrypoint.sh"]

# ── Development ───────────────────────────────────────────────────────────────
FROM base AS development

EXPOSE 8005
CMD ["python", "manage.py", "runserver", "0.0.0.0:8005"]

# ── Production ────────────────────────────────────────────────────────────────
FROM base AS production

RUN pip install --no-cache-dir gunicorn

RUN python manage.py collectstatic --noinput || true

EXPOSE 8005
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8005", \
     "--workers", "3", \
     "--timeout", "120", \
     "--access-logfile", "-"]
