from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.crud import create_event_log
from app.deps import get_current_user_optional, get_db
from app.models import User
from app.schemas import ApiResponse, EventLogCreateRequest

router = APIRouter(prefix="/api/event", tags=["event"])


@router.post("/create", response_model=ApiResponse)
def submit_event_log(
    payload: EventLogCreateRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """前端埋点上报接口，记录用户在页面上的关键操作。"""

    event_log_id = create_event_log(
        db=db,
        user=current_user,
        event_name=payload.eventName,
        page_name=payload.pageName,
        event_payload=payload.eventPayload,
    )
    return ApiResponse(data={"eventLogId": event_log_id})
