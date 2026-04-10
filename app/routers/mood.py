from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.crud import create_mood_record, get_today_mood_record, list_mood_records
from app.deps import get_current_user, get_db
from app.models import User
from app.schemas import ApiResponse, MoodCreateRequest

router = APIRouter(prefix="/api/mood", tags=["mood"])


@router.post("/create", response_model=ApiResponse)
def create_mood(
    payload: MoodCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建一条新的心情记录。"""

    data = create_mood_record(
        db=db,
        user=current_user,
        mood_type=payload.moodType,
        mood_intensity=payload.moodIntensity,
        mood_reason=payload.moodReason,
        mood_tags=payload.moodTags,
    )
    return ApiResponse(data=data)


@router.get("/today", response_model=ApiResponse)
def get_today_mood(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当天最新的心情快照。"""

    mood = get_today_mood_record(db, current_user)
    return ApiResponse(data=mood and {
        "moodRecordId": mood.id,
        "recordDate": mood.record_date,
        "moodType": mood.mood_type,
        "moodIntensity": mood.mood_intensity,
        "moodReason": mood.mood_reason,
        "moodTags": mood.mood_tags or [],
        "createdAt": mood.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        "updatedAt": mood.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
    })


@router.get("/list", response_model=ApiResponse)
def get_mood_list(
    pageNo: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=50),
    moodType: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """分页获取心情历史列表。"""

    data = list_mood_records(
        db=db,
        user_id=current_user.id,
        page_no=pageNo,
        page_size=pageSize,
        mood_type=moodType,
    )
    return ApiResponse(data=data)
