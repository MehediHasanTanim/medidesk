#!/bin/sh
set -e

echo "Waiting for database..."
python -c "
import os, time, psycopg2
for i in range(30):
    try:
        psycopg2.connect(
            dbname=os.environ.get('DB_NAME', 'medidesk_dev'),
            user=os.environ.get('DB_USER', 'postgres'),
            password=os.environ.get('DB_PASSWORD', ''),
            host=os.environ.get('DB_HOST', 'db'),
            port=os.environ.get('DB_PORT', '5432'),
        )
        print('Database ready.')
        break
    except psycopg2.OperationalError:
        print(f'Attempt {i+1}/30 — retrying in 2s...')
        time.sleep(2)
else:
    print('ERROR: Could not connect to database after 30 attempts.')
    exit(1)
"

echo "Running migrations..."
python manage.py migrate --noinput

exec "$@"
