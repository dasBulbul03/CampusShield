#!/bin/sh
# Starts the API server only.
#
# Migrations and seeding are deliberately NOT done here: in production this
# image runs as N concurrent Fargate tasks, and letting every task run
# `alembic upgrade head` races on DDL and hides schema failures behind
# restart loops. The CD workflow runs them once, as a separate one-off task
# via ./migrate.sh, and aborts the deployment if that task fails.
#
# Local docker-compose sets RUN_MIGRATIONS=1 to keep `docker compose up` a
# one-command experience against an empty database.
set -e

if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
  echo "RUN_MIGRATIONS=1 -> applying schema and seed data..."
  ./migrate.sh
fi

exec ./run.sh
