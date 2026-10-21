from datetime import datetime, timedelta, timezone
import hashlib
import uuid

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.config import get_settings

hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2)
settings = get_settings()


def hash_password(password: str) -> str:
    if len(password) < 12 or len(password) > 256:
        raise ValueError("Password must be 12 to 256 characters")
    return hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def make_token(user_id: str, token_type: str = "access", days: int | None = None) -> str:
    expiry = datetime.now(timezone.utc) + (timedelta(days=days) if days else timedelta(minutes=settings.access_token_minutes))
    return jwt.encode({"sub": user_id, "type": token_type, "exp": expiry}, settings.app_secret, algorithm="HS256")


def decode_access_token(token: str) -> str:
    payload = jwt.decode(token, settings.app_secret, algorithms=["HS256"])
    if payload.get("type") != "access" or not payload.get("sub"):
        raise jwt.InvalidTokenError("Invalid access token")
    return payload["sub"]


def new_refresh_token(user_id: str) -> tuple[str, str, datetime]:
    session_id = str(uuid.uuid4())
    expiry = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_days)
    token = jwt.encode({"sub": user_id, "sid": session_id, "type": "refresh", "exp": expiry}, settings.app_secret, algorithm="HS256")
    return session_id, token, expiry


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
