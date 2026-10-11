"""Detect a database created before Alembic owned the schema.

Until migrations were introduced, the app created tables with SQLAlchemy's
`Base.metadata.create_all()` at startup. Such a database holds the full
schema but has no `alembic_version` table, so `alembic upgrade head` would
replay the initial migration and abort with DuplicateTable.

Those databases must be *stamped* to the current head rather than migrated:
stamping only writes the version row and touches no DDL. Databases with no
tables at all (a genuine first deploy) migrate normally.

Usage: `python -m app.db.legacy` prints `stamp` or `migrate`.
"""
import sys

from sqlalchemy import inspect

from app.db.base import Base, engine
from app import models  # noqa: F401  (registers all tables on Base.metadata)


def needs_stamp(bind=None) -> bool:
    """True when the schema exists but Alembic has never recorded a version.

    `bind` defaults to the application engine; tests pass their own so the
    three states (empty / pre-Alembic / migrated) can be exercised directly.
    """
    inspector = inspect(bind or engine)
    tables = set(inspector.get_table_names())
    if "alembic_version" in tables:
        return False
    return not tables.isdisjoint(Base.metadata.tables)


def main() -> int:
    print("stamp" if needs_stamp() else "migrate")
    return 0


if __name__ == "__main__":
    sys.exit(main())
