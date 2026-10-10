from fastapi import APIRouter

from app.api.v1.endpoints import auth, complaints, admin, notifications

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(complaints.router, prefix="/complaints", tags=["complaints"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
