#!/bin/sh
# One-off release step: adopt or apply Alembic migrations, then seed data.
# Runs as its own ECS task (or locally via `sh migrate.sh`) before the app
# service is updated. Exits non-zero on failure so the CD workflow can block.
set -e

echo "Checking schema state..."
MODE=$(python -m app.db.legacy)

if [ "$MODE" = "stamp" ]; then
  # The schema already exists but Alembic has never recorded a version for
  # it. This is every database created before migrations were introduced
  # (`create_all()` built the tables). Replaying the initial migration would
  # abort with DuplicateTable, so record the current head without touching
  # any DDL.
  echo "Pre-Alembic database detected (tables exist, no alembic_version)."
  echo "Stamping schema to head instead of replaying migrations..."
  alembic stamp head
else
  echo "Applying database migrations..."
  alembic upgrade head
fi

echo "Seeding reference data (departments, demo users)..."
python -m app.db.init_db

echo "Migrations complete."
