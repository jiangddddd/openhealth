from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.crud import create_or_login_user, create_or_login_user_by_wechat
from app.deps import get_db
from app.schemas import ApiResponse, LoginRequest
from app.services.auth_token import create_access_token
from app.services.wechat_auth import exchange_wechat_code

router = APIRouter(prefix="/api/auth", tags=["auth"])


class WechatLoginRequest(BaseModel):
    code: str = Field(min_length=1)
    nickname: str | None = None
    avatarUrl: str | None = None


def _build_login_data(*, user_id: int, is_new_user: bool, extra: dict | None = None) -> dict:
    token, expire_at = create_access_token(user_id=user_id)
    data = {
        "token": token,
        "tokenType": "Bearer",
        "expiresAt": expire_at.isoformat().replace("+00:00", "Z"),
        "userId": user_id,
        "isNewUser": is_new_user,
    }
    if extra:
        data.update(extra)
    return data


@router.post("/login", response_model=ApiResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user, is_new_user = create_or_login_user(
        db=db,
        mobile=payload.mobile,
        login_type=payload.loginType,
    )
    return ApiResponse(
        data=_build_login_data(user_id=user.id, is_new_user=is_new_user)
    )


@router.post("/wechat/login", response_model=ApiResponse)
def wechat_login(payload: WechatLoginRequest, db: Session = Depends(get_db)):
    session_data = exchange_wechat_code(payload.code)
    user, is_new_user = create_or_login_user_by_wechat(
        db=db,
        openid=str(session_data["openid"]),
        unionid=session_data.get("unionid"),
        session_key=session_data.get("session_key"),
        nickname=payload.nickname,
        avatar_url=payload.avatarUrl,
    )
    return ApiResponse(
        data=_build_login_data(
            user_id=user.id,
            is_new_user=is_new_user,
            extra={"openid": session_data["openid"]},
        )
    )
