from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.crud import get_home_overview
from app.deps import get_current_user, get_db
from app.models import User
from app.schemas import ApiResponse

router = APIRouter(prefix="/api/home", tags=["home"])


@router.get("/overview", response_model=ApiResponse)
def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """聚合首页需要的今日总结、最近记录与连续记录信息。"""

    return ApiResponse(data=get_home_overview(db, current_user))
