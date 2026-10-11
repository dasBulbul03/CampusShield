import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.legacy import needs_stamp  # noqa: F401  (registers all tables on Base.metadata)
from app import models  # noqa: F401


@pytest.fixture
def fresh_engine():
    """An empty SQLite database on its own connection.

    StaticPool keeps one connection alive so the in-memory database survives
    across the inspector and the statements the tests issue.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    yield engine
    engine.dispose()


def test_empty_database_migrates_normally(fresh_engine):
    """A first deploy has no tables: Alembic must run the real migrations."""
    assert needs_stamp(fresh_engine) is False


def test_pre_alembic_database_needs_stamping(fresh_engine):
    """Tables built by the old create_all(), with no alembic_version.

    Replaying the initial migration here would abort with DuplicateTable, so
    this is the case the stamp path exists for.
    """
    Base.metadata.create_all(fresh_engine)
    assert needs_stamp(fresh_engine) is True


def test_migrated_database_does_not_stamp(fresh_engine):
    """Once alembic_version exists, migrations own the schema."""
    Base.metadata.create_all(fresh_engine)
    with fresh_engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE alembic_version ("
                "version_num VARCHAR(32) NOT NULL, "
                "PRIMARY KEY (version_num))"
            )
        )
        conn.execute(
            text("INSERT INTO alembic_version (version_num) VALUES ('head')")
        )
    assert needs_stamp(fresh_engine) is False


def test_unrelated_tables_are_not_mistaken_for_ours(fresh_engine):
    """A database holding only someone else's tables must still migrate."""
    with fresh_engine.begin() as conn:
        conn.execute(text("CREATE TABLE third_party_widget (id INTEGER)"))
    assert needs_stamp(fresh_engine) is False
