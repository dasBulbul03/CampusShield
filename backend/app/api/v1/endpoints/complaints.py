import logging
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
from pathlib import Path
from urllib.parse import quote

from app.core.config import settings
from app.core.constants import ComplaintStatus, UserRole
from app.db.base import get_db
from app.api.v1.dependencies.auth import get_current_user, require_admin, require_student
from app.models.user import User
from app.models.complaint import Complaint, ComplaintAnalysis, ComplaintUpdate, Evidence, Notification, Department, Feedback
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate as ComplaintUpdateSchema
from app.services.ai_service import AIService
from app.services.complaint_service import generate_complaint_number
from app.services.evidence_storage import (
    EvidenceStorageError,
    delete_evidence,
    get_evidence,
    save_evidence,
)

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {
    ext.strip().lower().lstrip(".")
    for ext in settings.ALLOWED_EXTENSIONS.split(",")
    if ext.strip()
}


def validate_evidence(evidence: UploadFile) -> tuple[str, str]:
    """Return (safe_extension, original_filename) or raise 400."""
    original = Path(evidence.filename or "").name
    ext = Path(original).suffix.lower().lstrip(".")

    if not ext or ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed extensions: {settings.ALLOWED_EXTENSIONS}",
        )

    evidence.file.seek(0, os.SEEK_END)
    size = evidence.file.tell()
    evidence.file.seek(0)

    if size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds the {settings.MAX_FILE_SIZE // (1024 * 1024)}MB size limit",
        )
    return ext, original


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_complaint(
    title: str = Form(...),
    description: str = Form(...),
    category: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    incident_date: Optional[str] = Form(None),
    incident_time: Optional[str] = Form(None),
    anonymous: bool = Form(False),
    evidence: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    evidence_ext = evidence_original = None
    if evidence:
        evidence_ext, evidence_original = validate_evidence(evidence)

    complaint_number = generate_complaint_number()
    incident_dt = None
    if incident_date:
        try:
            incident_dt = datetime.fromisoformat(incident_date.replace("Z", "+00:00")).replace(tzinfo=None)
        except (ValueError, TypeError):
            incident_dt = None
    complaint = Complaint(
        complaint_number=complaint_number,
        student_id=current_user.id if not anonymous else current_user.id,
        title=title,
        description=description,
        location=location,
        incident_date=incident_dt,
        incident_time=incident_time,
        anonymous=anonymous,
        status=ComplaintStatus.SUBMITTED,
    )
    if category:
        from app.core.constants import ComplaintCategory
        try:
            complaint.category = ComplaintCategory(category)
        except:
            pass

    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    if evidence:
        evidence.file.seek(0, os.SEEK_END)
        evidence_size = evidence.file.tell()
        evidence.file.seek(0)
        try:
            file_path, safe_name = save_evidence(evidence.file, evidence_ext, complaint.id)
        except EvidenceStorageError as exc:
            raise HTTPException(status_code=503, detail="Evidence storage is temporarily unavailable") from exc

        ev = Evidence(
            complaint_id=complaint.id,
            filename=safe_name,
            original_filename=evidence_original,
            file_path=file_path,
            file_size=evidence_size,
            file_type=evidence.content_type or "application/octet-stream",
        )
        db.add(ev)
        try:
            db.commit()
        except Exception:
            db.rollback()
            delete_evidence(file_path)
            raise

    return {"id": complaint.id, "complaint_number": complaint.complaint_number}


@router.get("/my")
def get_my_complaints(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    complaints = db.query(Complaint).filter(Complaint.student_id == current_user.id).order_by(Complaint.created_at.desc()).all()
    result = []
    for c in complaints:
        result.append({
            "id": c.id,
            "complaint_number": c.complaint_number,
            "title": c.title,
            "category": c.category.value if c.category else None,
            "severity": c.severity.value if c.severity else None,
            "priority": c.priority.value if c.priority else None,
            "status": c.status.value,
            "anonymous": c.anonymous,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "department": c.department.name if c.department else None,
        })
    return result


@router.get("/{complaint_id}")
def get_complaint(complaint_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if current_user.role != UserRole.ADMIN and c.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    analysis = c.analysis
    updates = []
    for u in sorted(c.updates, key=lambda x: x.created_at):
        updates.append({
            "status": u.status.value,
            "note": u.note,
            "created_at": u.created_at,
        })
    return {
        "id": c.id,
        "complaint_number": c.complaint_number,
        "title": c.title,
        "description": c.description,
        "category": c.category.value if c.category else None,
        "location": c.location,
        "incident_date": c.incident_date,
        "incident_time": c.incident_time,
        "anonymous": c.anonymous,
        "severity": c.severity.value if c.severity else None,
        "priority": c.priority.value if c.priority else None,
        "status": c.status.value,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "student_name": c.student.full_name if c.student and not c.anonymous else ("Anonymous" if c.anonymous else c.student.full_name),
        "student_email": c.student.email if c.student and not c.anonymous else None,
        "department": c.department.name if c.department else None,
        "department_id": c.department_id,
        "analysis": {
            "category": analysis.category.value,
            "severity": analysis.severity.value,
            "priority": analysis.priority.value,
            "recommended_department": analysis.recommended_department,
            "summary": analysis.summary,
            "risk_factors": analysis.risk_factors,
            "recommended_action": analysis.recommended_action,
            "ai_model_used": analysis.ai_model_used,
            "used_fallback": analysis.used_fallback,
        } if analysis else None,
        "updates": updates,
        "evidence": [
            {"id": e.id, "filename": e.original_filename, "file_size": e.file_size, "file_type": e.file_type}
            for e in c.evidence
        ],
        "feedback": _serialize_feedback(c.feedback),
    }


@router.get("/{complaint_id}/evidence/{evidence_id}")
def download_evidence(
    complaint_id: int,
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if current_user.role != UserRole.ADMIN and c.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    ev = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id, Evidence.complaint_id == complaint_id)
        .first()
    )
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")

    try:
        stored_evidence = get_evidence(ev.file_path)
    except EvidenceStorageError as exc:
        raise HTTPException(status_code=503, detail="Evidence storage is temporarily unavailable") from exc
    if stored_evidence is None:
        raise HTTPException(status_code=404, detail="Evidence file is missing")

    original_filename = ev.original_filename or ev.filename
    media_type = ev.file_type or "application/octet-stream"
    if isinstance(stored_evidence, Path):
        return FileResponse(path=stored_evidence, filename=original_filename, media_type=media_type)

    return StreamingResponse(
        stored_evidence.iter_chunks(chunk_size=64 * 1024),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(original_filename)}"},
    )


@router.post("/{complaint_id}/analyze")
def analyze_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if c.student_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")

    ai = AIService()
    result = ai.analyze_complaint(c.title, c.description, c.location)

    from app.core.constants import ComplaintCategory, Severity, Priority
    analysis = c.analysis or ComplaintAnalysis(complaint=c)
    analysis.category = ComplaintCategory(result["category"])
    analysis.severity = Severity(result["severity"])
    analysis.priority = Priority(result["priority"])
    analysis.recommended_department = result["recommended_department"]
    analysis.summary = result["summary"]
    analysis.risk_factors = json_dumps_safe(result.get("risk_factors", []))
    analysis.recommended_action = result["recommended_action"]
    analysis.ai_model_used = result.get("ai_model_used")
    analysis.used_fallback = result.get("used_fallback", False)
    c.status = ComplaintStatus.AI_ANALYZED
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {"success": True, "analysis": result}


def json_dumps_safe(obj):
    import json
    return json.dumps(obj) if obj else None


def _serialize_feedback(fb) -> Optional[dict]:
    if not fb:
        return None
    return {
        "id": fb.id,
        "rating": fb.rating,
        "comment": fb.comment,
        "submitted_at": fb.submitted_at,
    }


@router.post("/{complaint_id}/status")
def update_status(
    complaint_id: int,
    status_val: str = Form(...),
    note: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin required")
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    from app.core.constants import ComplaintStatus
    try:
        new_status = ComplaintStatus(status_val)
    except:
        raise HTTPException(status_code=400, detail="Invalid status")
    c.status = new_status
    update = ComplaintUpdate(
        complaint_id=c.id,
        status=new_status,
        note=note,
        updated_by=current_user.id,
    )
    db.add(update)

    notif = Notification(
        user_id=c.student_id,
        complaint_id=c.id,
        message=f"Complaint {c.complaint_number} is now {new_status.value.replace('_', ' ')}",
    )
    db.add(notif)
    db.commit()
    return {"success": True}


@router.post("/{complaint_id}/assign")
def assign_complaint(
    complaint_id: int,
    department_id: int = Form(...),
    severity: Optional[str] = Form(None),
    priority: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin required")
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    c.department_id = dept.id
    from app.core.constants import Severity, Priority, ComplaintStatus
    if severity:
        try:
            c.severity = Severity(severity)
        except:
            pass
    if priority:
        try:
            c.priority = Priority(priority)
        except:
            pass
    if c.status == ComplaintStatus.AI_ANALYZED:
        c.status = ComplaintStatus.ASSIGNED
    update = ComplaintUpdate(
        complaint_id=c.id,
        status=c.status,
        note=f"Assigned to {dept.name}",
        updated_by=current_user.id,
    )
    db.add(update)
    notif = Notification(
        user_id=c.student_id,
        complaint_id=c.id,
        message=f"Complaint {c.complaint_number} has been assigned to {dept.name}",
    )
    db.add(notif)
    db.commit()
    return {"success": True}


@router.get("/{complaint_id}/feedback")
def get_feedback(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if current_user.role != UserRole.ADMIN and c.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return {"feedback": _serialize_feedback(c.feedback)}


@router.post("/{complaint_id}/feedback")
def submit_feedback(
    complaint_id: int,
    rating: int = Form(...),
    comment: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c or c.student_id != current_user.id:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if c.status != ComplaintStatus.RESOLVED:
        raise HTTPException(
            status_code=400,
            detail="Feedback can only be submitted after the complaint is resolved",
        )
    if c.feedback:
        raise HTTPException(status_code=400, detail="Feedback has already been submitted")
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    fb = Feedback(complaint_id=c.id, rating=rating, comment=comment)
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return {"success": True, "feedback": _serialize_feedback(fb)}
