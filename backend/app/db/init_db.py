from sqlalchemy.orm import Session
from app.db.base import SessionLocal
from app.core.security import get_password_hash
from app.core.constants import UserRole
from app.models.user import User
from app.models.complaint import Department


def init_db():
    db = SessionLocal()
    try:
        # Create departments
        depts = [
            "Campus Security",
            "Student Welfare",
            "Anti-Ragging Committee",
            "IT / Cybersecurity",
            "Hostel Administration",
            "Academic Administration",
            "Facilities",
        ]
        for d in depts:
            if not db.query(Department).filter(Department.name == d).first():
                db.add(Department(name=d))
        db.commit()

        # Create demo users
        if not db.query(User).filter(User.email == "admin@campusshield.demo").first():
            admin = User(
                email="admin@campusshield.demo",
                full_name="CampusShield Admin",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN,
            )
            db.add(admin)
        if not db.query(User).filter(User.email == "student@campusshield.demo").first():
            student = User(
                email="student@campusshield.demo",
                full_name="Demo Student",
                hashed_password=get_password_hash("student123"),
                role=UserRole.STUDENT,
            )
            db.add(student)
        db.commit()
    finally:
        db.close()
