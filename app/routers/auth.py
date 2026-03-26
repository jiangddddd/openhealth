from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.crud import create_or_login_user
from app.deps import get_db
from app.schemas import ApiResponse, LoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=ApiResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user, is_new_user = create_or_login_user(
        db=db,
        mobile=payload.mobile,
        login_type=payload.loginType,
    )
    return ApiResponse(
        data={
            "token": f"token_{user.id}",
            "userId": user.id,
            "isNewUser": is_new_user,
        }
    )
