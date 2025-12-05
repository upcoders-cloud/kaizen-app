#!/bin/sh

# Stop on the first error
set -e

echo "Applying database migrations..."
python manage.py migrate

# Optional: Load initial data if you have fixtures
# python manage.py loaddata initial_data.json

echo "Starting server..."
python manage.py runserver 0.0.0.0:8000