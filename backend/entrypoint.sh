#!/bin/sh

# Stop on the first error
set -e

echo "Applying database migrations..."
python manage.py migrate

# Seedy odpalają się tylko gdy SEED_DB=true (np. pierwszy run lub świeża baza).
# Domyślnie pominięte, żeby restart Dockera nie nadpisywał lokalnych danych.
if [ "${SEED_DB}" = "true" ]; then
  echo "Seeding users..."
  python manage.py init_users

  echo "Seeding posts..."
  python manage.py init_posts

  echo "Seeding comments..."
  python manage.py init_comments
else
  echo "Skipping seeders (set SEED_DB=true to enable)."
fi

echo "Starting server..."
python manage.py runserver 0.0.0.0:8000
