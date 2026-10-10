from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from app.core.constants import (
    ComplaintStatus,
    ComplaintCategory,
    Severity,
    Priority,
)


class ComplaintCreate(BaseModel):
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    category: Optional[ComplaintCategory] = None
    location: Optional[str] = None
    incident_date: Optional[datetime] = None
    incident_time: Optional[str] = None
    anonymous: bool = False


class ComplaintUpdate(BaseModel):
    category: Optional[ComplaintCategory] = None
    severity: Optional[Severity] = None
    priority: Optional[Priority] = None
    department_id: Optional[int] = None
    status: Optional[ComplaintStatus] = None


class ComplaintResponse(BaseModel):
    id: int
    complaint_number: str
    title: str
    description: str
    category: Optional[ComplaintCategory]
    location: Optional[str]
    incident_date: Optional[datetime]
    incident_time: Optional[str]
    anonymous: bool
    severity: Optional[Severity]
    priority: Optional[Priority]
    status: ComplaintStatus
    created_at: datetime
    updated_at: datetime
    department_id: Optional[int]
    student_id: int

    class Config:
        from_attributes = True
