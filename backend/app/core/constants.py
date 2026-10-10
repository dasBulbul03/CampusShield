from enum import Enum


class UserRole(str, Enum):
    STUDENT = "STUDENT"
    ADMIN = "ADMIN"


class ComplaintStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    AI_ANALYZED = "AI_ANALYZED"
    ASSIGNED = "ASSIGNED"
    UNDER_REVIEW = "UNDER_REVIEW"
    INVESTIGATING = "INVESTIGATING"
    ACTION_TAKEN = "ACTION_TAKEN"
    RESOLVED = "RESOLVED"


class ComplaintCategory(str, Enum):
    HARASSMENT = "HARASSMENT"
    RAGGING = "RAGGING"
    THREAT = "THREAT"
    THEFT = "THEFT"
    CYBERCRIME = "CYBERCRIME"
    BULLYING = "BULLYING"
    HOSTEL_SAFETY = "HOSTEL_SAFETY"
    INFRASTRUCTURE = "INFRASTRUCTURE"
    ACADEMIC = "ACADEMIC"
    OTHER = "OTHER"


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Priority(str, Enum):
    P1 = "P1"  # Critical
    P2 = "P2"  # High
    P3 = "P3"  # Medium
    P4 = "P4"  # Low
