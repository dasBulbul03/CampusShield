def test_liveness_endpoint_is_dependency_free(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["version"]


def test_readiness_reports_ready_when_db_is_up_and_migrated(client):
    resp = client.get("/health/ready")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ready"


def test_readiness_returns_503_when_database_unreachable(client):
    from app.db.base import get_db
    from app.main import app

    class _BrokenSession:
        def execute(self, *_args, **_kwargs):
            raise RuntimeError("connection refused")

    def _broken_db():
        yield _BrokenSession()

    app.dependency_overrides[get_db] = _broken_db
    try:
        resp = client.get("/health/ready")
        assert resp.status_code == 503
        assert "Database unreachable" in resp.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_readiness_returns_503_when_schema_not_migrated(client):
    """A service that started before the migration task ran must not go InService."""
    from sqlalchemy import text

    from app.db.base import engine

    with engine.begin() as conn:
        conn.exec_driver_sql("DROP TABLE alembic_version")

    try:
        resp = client.get("/health/ready")
        assert resp.status_code == 503
        assert "not migrated" in resp.json()["detail"]
    finally:
        with engine.begin() as conn:
            conn.exec_driver_sql("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)")
            conn.exec_driver_sql(
                "INSERT INTO alembic_version (version_num) VALUES ('964e2acffefc')"
            )
        conn_check = engine.connect()
        assert conn_check.execute(text("SELECT 1")).scalar() == 1
        conn_check.close()
