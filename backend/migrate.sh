#!/bin/sh
# One-off release step: apply Alembic migrations, then seed reference data.
# Runs as its own ECS task (or locally via `sh migrate.sh`) before the app
# service is updated. Exits non-zero on failure so the CD workflow can block.
set -e

echo "Applying database migrations..."
alembic upgrade head

echo "Seeding reference data (departments, demo users)..."
python -m app.db.init_db

echo "Migrations complete."
