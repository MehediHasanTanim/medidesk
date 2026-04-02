# Docker Commands — MediDesk

All commands should be run from the **project root** directory (`medidesk/`).

---

## Quick Start

```bash
# Build images and start all services in the background
docker compose up --build -d
```

Open **http://localhost:5175** in your browser.

---

## Start & Stop

```bash
# Start all services (foreground — shows live logs)
docker compose up

# Start all services (background / detached)
docker compose up -d

# Build images then start (use after code changes)
docker compose up --build -d

# Stop all running services (keeps containers & volumes)
docker compose stop

# Stop and remove containers (keeps volumes)
docker compose down

# Stop and remove containers + volumes (wipes database)
docker compose down -v
```

---

## Individual Services

Start or stop a single service by appending its name:

```bash
# Database only
docker compose up -d db
docker compose stop db

# Backend only
docker compose up -d backend
docker compose stop backend

# Frontend only
docker compose up -d frontend
docker compose stop frontend

# Redis only
docker compose up -d redis
docker compose stop redis

# Celery worker only
docker compose up -d celery
docker compose stop celery
```

---

## Rebuild

```bash
# Rebuild all images (no cache)
docker compose build --no-cache

# Rebuild a specific service
docker compose build --no-cache backend
docker compose build --no-cache frontend
```

---

## Logs

```bash
# Tail logs for all services
docker compose logs -f

# Tail logs for a specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
docker compose logs -f celery
docker compose logs -f redis

# Last 50 lines from a service
docker compose logs --tail=50 backend
```

---

## Status

```bash
# Show running containers and mapped ports
docker compose ps

# Show resource usage (CPU, memory)
docker stats
```

---

## Django Management Commands

Run Django commands inside the backend container:

```bash
# Apply migrations
docker compose exec backend python manage.py migrate

# Create a superuser interactively
docker compose exec backend python manage.py createsuperuser

# Create a user with the bundled script
docker compose exec backend python create_user.py \
  --username dr_rahim \
  --full-name "Dr. Rahim" \
  --role doctor \
  --password Doctor1234!

# Open Django shell
docker compose exec backend python manage.py shell

# Collect static files
docker compose exec backend python manage.py collectstatic --noinput

# Show all API routes
docker compose exec backend python manage.py show_urls
```

---

## Database

```bash
# Open a psql session inside the db container
docker compose exec db psql -U postgres -d medidesk_dev

# Dump the database to a file
docker compose exec db pg_dump -U postgres medidesk_dev > backup.sql

# Restore from a dump
docker compose exec -T db psql -U postgres -d medidesk_dev < backup.sql
```

---

## Production

```bash
# Start with production overrides (gunicorn, nginx, optimised builds)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Rebuild for production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

---

## Service URLs

| Service | URL |
|---|---|
| Frontend (React) | http://localhost:5175 |
| Backend API | http://localhost:8005/api/v1/ |
| Django Admin | http://localhost:8005/admin/ |
| PostgreSQL | localhost:5433 |

---

## Common Troubleshooting

```bash
# Container keeps restarting — check its logs
docker compose logs --tail=50 backend

# Force recreate containers (picks up env changes)
docker compose up -d --force-recreate

# Remove all stopped containers and dangling images
docker system prune

# Remove everything including volumes (full reset)
docker compose down -v
docker system prune -a
```
