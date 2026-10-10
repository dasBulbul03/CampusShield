from typing import Optional
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.constants import ComplaintStatus, Severity, Priority, ComplaintCategory
from app.db.base import get_db
from app.api.v1.dependencies.auth import require_admin
from app.models.user import User
from app.models.complaint import Complaint, Department, Feedback

router = APIRouter()


@router.get("/dashboard")
def admin_dashboard(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    total = db.query(Complaint).count()
    open_cases = db.query(Complaint).filter(Complaint.status != ComplaintStatus.RESOLVED).count()
    high_priority = db.query(Complaint).filter(Complaint.priority.in_([Priority.P2, Priority.P1])).count()
    critical = db.query(Complaint).filter(Complaint.priority == Priority.P1).count()
    resolved = db.query(Complaint).filter(Complaint.status == ComplaintStatus.RESOLVED).count()

    recent = db.query(Complaint).order_by(Complaint.created_at.desc()).limit(10).all()
    recent_list = []
    for c in recent:
        recent_list.append({
            "id": c.id,
            "complaint_number": c.complaint_number,
            "title": c.title,
            "category": c.category.value if c.category else None,
            "severity": c.severity.value if c.severity else None,
            "priority": c.priority.value if c.priority else None,
            "status": c.status.value,
            "created_at": c.created_at,
            "department": c.department.name if c.department else None,
        })

    return {
        "stats": {
            "total": total,
            "open_cases": open_cases,
            "high_priority": high_priority,
            "critical": critical,
            "resolved": resolved,
        },
        "recent": recent_list,
    }


@router.get("/complaints")
def list_complaints(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    query = db.query(Complaint)

    if status:
        try:
            query = query.filter(Complaint.status == ComplaintStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status filter")
    if priority:
        try:
            query = query.filter(Complaint.priority == Priority(priority))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid priority filter")
    if category:
        try:
            query = query.filter(Complaint.category == ComplaintCategory(category))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid category filter")
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Complaint.complaint_number.ilike(term),
                Complaint.title.ilike(term),
            )
        )

    total = query.count()
    pages = max(1, ceil(total / page_size)) if total else 1
    page = min(page, pages)

    rows = (
        query.order_by(Complaint.created_at.desc(), Complaint.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    res = []
    for c in rows:
        res.append({
            "id": c.id,
            "complaint_number": c.complaint_number,
            "title": c.title,
            "category": c.category.value if c.category else None,
            "severity": c.severity.value if c.severity else None,
            "priority": c.priority.value if c.priority else None,
            "status": c.status.value,
            "anonymous": c.anonymous,
            "created_at": c.created_at,
            "department": c.department.name if c.department else None,
        })

    return {
        "items": res,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


@router.get("/analytics")
def analytics(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    by_category = db.query(Complaint.category, func.count(Complaint.id)).group_by(Complaint.category).all()
    by_severity = db.query(Complaint.severity, func.count(Complaint.id)).group_by(Complaint.severity).all()
    by_status = db.query(Complaint.status, func.count(Complaint.id)).group_by(Complaint.status).all()

    return {
        "by_category": [{"category": k.value if k else "UNCLASSIFIED", "count": v} for k, v in by_category],
        "by_severity": [{"severity": k.value if k else "UNSET", "count": v} for k, v in by_severity],
        "by_status": [{"status": k.value, "count": v} for k, v in by_status],
    }


@router.get("/departments")
def get_departments(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    depts = db.query(Department).all()
    return [{"id": d.id, "name": d.name} for d in depts]
