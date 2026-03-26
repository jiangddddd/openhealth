from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.crud import get_or_create_fortune
from app.deps import get_current_user, get_db
from app.models import User
from app.schemas import ApiResponse

router = APIRouter(prefix="/api/fortune", tags=["fortune"])


@router.get("/today", response_model=ApiResponse)
def get_today_fortune(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ApiResponse(data=get_or_create_fortune(db, current_user))
