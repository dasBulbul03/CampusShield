import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.core.constants import ComplaintStatus
from app.models.complaint import Complaint


def generate_complaint_number() -> str:
    return f"CS-{datetime.now().year % 1000}{str(uuid.uuid4())[:6].upper()}"
