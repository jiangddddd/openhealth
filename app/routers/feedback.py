from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.crud import create_feedback
from app.deps import get_current_user, get_db
from app.models import User
from app.schemas import ApiResponse, FeedbackCreateRequest

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.post("/create", response_model=ApiResponse)
def submit_feedback(
    payload: FeedbackCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    create_feedback(
        db=db,
        user=current_user,
        target_type=payload.targetType,
        target_id=payload.targetId,
        feedback_type=payload.feedbackType,
        content=payload.content,
    )
    return ApiResponse(data={})
