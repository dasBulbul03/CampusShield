from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _safe(s: str) -> str:
    if not s:
        return ""
    b = s.encode("utf-8")
    if len(b) > 72:
        b = b[:72]
    return b.decode("utf-8", errors="ignore")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(_safe(plain_password), hashed_password)
    except Exception:
        try:
            return pwd_context.verify(plain_password[:72], hashed_password)
        except Exception:
            return False


def get_password_hash(password: str) -> str:
    try:
        return pwd_context.hash(password[:72] if len(password.encode("utf-8")) > 72 else password)
    except Exception:
        try:
            return pwd_context.hash(_safe(password))
        except Exception:
            import bcrypt
            h = bcrypt.hashpw((_safe(password)).encode("utf-8"), bcrypt.gensalt())
            return h.decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
