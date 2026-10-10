import os
import pathlib
import sys
import uuid

BACKEND_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

TEST_DB_PATH = pathlib.Path("/tmp/campusshield_pytest.db")
TEST_UPLOAD_DIR = pathlib.Path("/tmp/campusshield_pytest_uploads")

# These must be set before any `app.*` import so Settings picks them up.
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["GEMINI_API_KEY"] = ""  # force the deterministic fallback classifier
os.environ["UPLOAD_DIR"] = str(TEST_UPLOAD_DIR)

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
import pytest


@pytest.fixture(scope="session")
def client():
    """Boot the app once, applying the real Alembic migrations first."""
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    TEST_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    alembic_cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    command.upgrade(alembic_cfg, "head")

    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _clean_db(client):
    """Give every test an empty database plus the seeded reference data."""
    from app.db.base import Base, SessionLocal, engine
    from app.db.init_db import init_db

    with engine.begin() as conn:
        conn.exec_driver_sql("PRAGMA foreign_keys=OFF")
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.exec_driver_sql("PRAGMA foreign_keys=ON")

    init_db()
    yield


def register_user(client, email=None, password="passw0rd!", full_name="Test Student"):
    email = email or f"student-{uuid.uuid4().hex[:10]}@test.dev"
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": full_name},
    )
    assert resp.status_code == 200, resp.text
    return resp.json(), email


def login(client, email, password="passw0rd!"):
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def promote_to_admin(email):
    from app.core.constants import UserRole
    from app.db.base import SessionLocal
    from app.models.user import User

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        user.role = UserRole.ADMIN
        db.commit()
    finally:
        db.close()


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def student(client):
    """A freshly registered student, already logged in."""
    token_data, email = register_user(client)
    return {"token": token_data["access_token"], "email": email, "id": None}


@pytest.fixture
def admin(client):
    """A freshly registered student promoted to admin, re-logged in."""
    _, email = register_user(client, full_name="Test Admin")
    promote_to_admin(email)
    token_data = login(client, email)
    return {"token": token_data["access_token"], "email": email}
