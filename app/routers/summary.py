from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud import generate_today_summary, get_today_summary, list_daily_summaries
from app.deps import get_current_user, get_db
from app.models import User
from app.schemas import ApiResponse, SummaryGenerateRequest

router = APIRouter(prefix="/api/summary", tags=["summary"])


def _serialize_summary(summary) -> dict:
    """把每日总结对象整理成统一响应结构。"""

    return {
        "summaryId": summary.id,
        "summaryDate": summary.summary_date,
        "overallStatus": summary.overall_status,
        "mainFactors": summary.main_factors,
        "attentionPoint": summary.attention_point,
        "reminder": summary.reminder,
        "dietAdvice": {
            "direction": summary.diet_direction,
            "eatMore": summary.eat_more or [],
            "eatLess": summary.eat_less or [],
            "tip": summary.diet_tip,
        },
        "status": summary.status,
        "createdAt": summary.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        "updatedAt": summary.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
    }


@router.post("/generate", response_model=ApiResponse)
def generate_summary(
    payload: SummaryGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """根据当天心情与梦境记录生成今日总结。"""

    data = generate_today_summary(
        db=db,
        user=current_user,
        force_regenerate=payload.forceRegenerate,
    )
    if not data:
        raise HTTPException(status_code=400, detail="No mood or dream records for today")
    return ApiResponse(data=data)


@router.get("/today", response_model=ApiResponse)
def get_summary_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当天已经生成的总结。"""

    summary = get_today_summary(db, current_user)
    return ApiResponse(data=_serialize_summary(summary) if summary else None)


@router.get("/list", response_model=ApiResponse)
def get_summary_list(
    pageNo: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """分页获取每日总结历史。"""

    return ApiResponse(
        data=list_daily_summaries(
            db=db,
            user_id=current_user.id,
            page_no=pageNo,
            page_size=pageSize,
        )
    )
