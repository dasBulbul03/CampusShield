from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.api.v1.dependencies.auth import get_current_user
from app.models.user import User
from app.models.complaint import Notification

router = APIRouter()


def _serialize(n: Notification) -> dict:
    return {
        "id": n.id,
        "complaint_id": n.complaint_id,
        "complaint_number": n.complaint.complaint_number if n.complaint else None,
        "message": n.message,
        "read": n.read,
        "created_at": n.created_at,
    }


@router.get("/")
def list_notifications(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    limit = max(1, min(limit, 200))
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(limit)
        .all()
    )
    unread = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.read.is_(False))
        .count()
    )
    return {"items": [_serialize(n) for n in rows], "unread_count": unread}


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read.is_(False),
    ).update({"read": True}, synchronize_session=False)
    db.commit()
    return {"success": True, "unread_count": 0}


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    n = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    if not n.read:
        n.read = True
        db.commit()
    unread = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.read.is_(False))
        .count()
    )
    return {"success": True, "unread_count": unread}
