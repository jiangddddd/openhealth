from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User
from app.services.auth_token import TokenValidationError, decode_access_token


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _extract_user_id(authorization: str | None) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_access_token(token)
        return int(payload["user_id"])
    except TokenValidationError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    user_id = _extract_user_id(authorization)
    user = db.get(User, user_id)
    if not user or user.is_deleted:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_current_user_optional(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User | None:
    """可选登录态解析，适合首页曝光等允许匿名上报的场景。"""

    if not authorization:
        return None

    try:
        user_id = _extract_user_id(authorization)
    except HTTPException:
        return None

    user = db.get(User, user_id)
    if not user or user.is_deleted:
        return None
    return user
