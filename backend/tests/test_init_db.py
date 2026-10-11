from app.core.config import settings
from app.db.base import SessionLocal
from app.db.init_db import init_db
from app.models.user import User


def test_demo_users_are_not_seeded_when_disabled(monkeypatch):
    monkeypatch.setattr(settings, "SEED_DEMO_USERS", False)
    db = SessionLocal()
    try:
        db.query(User).filter(User.email.in_([
            "admin@campusshield.demo",
            "student@campusshield.demo",
        ])).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()

    init_db()

    db = SessionLocal()
    try:
        users = db.query(User).filter(User.email.in_([
            "admin@campusshield.demo",
            "student@campusshield.demo",
        ])).all()
        assert users == []
    finally:
        db.close()
