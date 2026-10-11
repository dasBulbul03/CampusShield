import logging

from fastapi.testclient import TestClient


def test_startup_warns_when_gemini_key_is_unset(caplog):
    """An operator deploying without a key must see it in the logs.

    The app is designed to keep working via the fallback classifier, so this
    is a warning rather than a hard failure - but it must not be silent.
    """
    from app.main import app

    with caplog.at_level(logging.WARNING, logger="app.main"):
        with TestClient(app):
            pass

    messages = " ".join(record.getMessage() for record in caplog.records)
    assert "GEMINI_API_KEY is not set" in messages
    assert "fallback classifier" in messages


def test_startup_warns_on_placeholder_secret_key(caplog):
    """Signing JWTs with the documented placeholder must be called out."""
    from app.core.config import settings
    from app.main import app

    original = settings.SECRET_KEY
    settings.SECRET_KEY = "changeme-super-secret-key-change-in-production"
    try:
        with caplog.at_level(logging.WARNING, logger="app.main"):
            with TestClient(app):
                pass
    finally:
        settings.SECRET_KEY = original

    messages = " ".join(record.getMessage() for record in caplog.records)
    assert "SECRET_KEY is still the documented placeholder" in messages
