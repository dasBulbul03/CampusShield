from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.api.v1.api import api_router
from app.db.base import get_db

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(parents=True, exist_ok=True)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health")
def health():
    """Liveness probe.

    Deliberately touches no dependencies: a process that can answer this is
    alive. An ALB target or ECS container health check hitting a dead DB must
    still get a crisp answer here, with readiness reported separately.
    """
    return {"status": "ok", "version": settings.VERSION}


@app.get("/health/ready")
def readiness(db: Session = Depends(get_db)):
    """Readiness probe: database reachable AND schema migrated.

    Returns 503 so the ALB pulls the target out of rotation. The second query
    proves migrations ran - if the migration task failed or was skipped, the
    app is not ready even though it is up.
    """
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(status_code=503, detail="Database unreachable")

    try:
        db.execute(text("SELECT version_num FROM alembic_version LIMIT 1"))
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Schema not migrated: alembic_version missing",
        )

    return {"status": "ready", "version": settings.VERSION}


@app.get("/")
def root():
    return {"message": "CampusShield API is running", "version": settings.VERSION}
