import json
from ast import literal_eval

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud import create_dream_interpretation, delete_dream, get_dream_detail
from app.crud import list_dreams, submit_followup
from app.deps import get_current_user, get_db
from app.models import User
from app.schemas import ApiResponse, DreamDeleteRequest, DreamFollowupRequest
from app.schemas import DreamInterpretRequest

router = APIRouter(prefix="/api/dream", tags=["dream"])


def _parse_payload(payload: str | None):
    """把数据库里保存的 JSON 字符串恢复成 Python 对象。"""

    if not payload:
        return None
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        return literal_eval(payload)


def _to_display_text(value):
    """把接口返回前的数据统一转换成可展示文本。"""

    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "、".join(_to_display_text(item) for item in value if _to_display_text(item))
    if isinstance(value, dict):
        parts = []
        for key, item in value.items():
            item_text = _to_display_text(item)
            if item_text:
                parts.append(f"{key}：{item_text}")
        return "\n".join(parts)
    return str(value)


def _to_string_list(value):
    """把接口输出统一成字符串数组，避免前端渲染时报类型错误。"""

    if value is None:
        return []
    if isinstance(value, list):
        return [_to_display_text(item) for item in value if _to_display_text(item)]
    text = _to_display_text(value)
    return [text] if text else []


def _normalize_base_interpretation(payload):
    """规范化基础解梦结构。"""

    if not isinstance(payload, dict):
        return payload
    return {
        "conclusion": _to_display_text(payload.get("conclusion")),
        "symbols": _to_display_text(payload.get("symbols")),
        "mapping": _to_display_text(payload.get("mapping")),
        "reminder": _to_display_text(payload.get("reminder")),
        "goodFor": _to_string_list(payload.get("goodFor")),
        "avoidFor": _to_string_list(payload.get("avoidFor")),
    }


def _normalize_followup_interpretation(payload):
    """规范化追问补充解析结构。"""

    if not isinstance(payload, dict):
        return payload
    return {
        "closerState": _to_display_text(payload.get("closerState")),
        "deeperReason": _to_display_text(payload.get("deeperReason")),
        "suggestion": _to_display_text(payload.get("suggestion")),
    }


@router.get("/list", response_model=ApiResponse)
def get_dream_list(
    pageNo: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=50),
    filterType: str | None = Query(default="all"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """历史列表接口，返回用户保存过的梦境记录。"""

    _ = filterType
    data = list_dreams(db, current_user.id, pageNo, pageSize)
    return ApiResponse(data=data)


@router.post("/interpret", response_model=ApiResponse)
def interpret_dream(
    payload: DreamInterpretRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """梦境提交接口，负责创建梦境记录并生成基础解析。"""

    data = create_dream_interpretation(
        db=db,
        user=current_user,
        dream_text=payload.dreamText,
        emotion_after_waking=payload.emotionAfterWaking,
        dream_people=payload.dreamPeople,
        dream_symbols=payload.dreamSymbols,
    )
    return ApiResponse(data=data)


@router.post("/delete", response_model=ApiResponse)
def remove_dream(
    payload: DreamDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除梦境接口，当前实现为软删除。"""

    ok = delete_dream(db, current_user.id, payload.dreamRecordId)
    if not ok:
        raise HTTPException(status_code=404, detail="Dream record not found")
    return ApiResponse(data={})


@router.post("/followup", response_model=ApiResponse)
def answer_followup(
    payload: DreamFollowupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """追问回答接口，每条梦境当前只允许一轮追问。"""

    data = submit_followup(
        db=db,
        user=current_user,
        dream_record_id=payload.dreamRecordId,
        followup_question=payload.followupQuestion,
        user_answer=payload.userAnswer,
    )
    if not data:
        raise HTTPException(status_code=404, detail="Followup not found")
    return ApiResponse(data=data)


@router.get("/{dream_record_id}", response_model=ApiResponse)
def get_dream(
    dream_record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """梦境详情接口，返回原文、基础解读、追问状态等完整内容。"""

    dream = get_dream_detail(db, current_user.id, dream_record_id)
    if not dream:
        raise HTTPException(status_code=404, detail="Dream record not found")

    base_interpretation = _normalize_base_interpretation(_parse_payload(dream.base_interpretation))
    followup_question = None
    followup_id = None
    followup_answer = None
    followup_interpretation = None
    if dream.followups:
        latest_followup = dream.followups[-1]
        followup_id = latest_followup.id
        followup_question = latest_followup.followup_question
        followup_answer = latest_followup.user_answer
        followup_interpretation = _normalize_followup_interpretation(
            _parse_payload(latest_followup.followup_interpretation)
        )
    data = {
        "dreamRecordId": dream.id,
        "dreamText": dream.dream_text,
        "emotionAfterWaking": dream.emotion_after_waking,
        "dreamPeople": dream.dream_people,
        "dreamSymbols": dream.dream_symbols,
        "autoTitle": dream.auto_title,
        "tags": dream.tags,
        "summary": dream.summary,
        "baseInterpretation": base_interpretation,
        "followupId": followup_id,
        "followupQuestion": followup_question,
        "followupAnswer": followup_answer,
        "followupInterpretation": followup_interpretation,
        "deepInterpretation": (
            dream.deep_interpretation if current_user.membership_status == "pro" else None
        ),
        "createdAt": dream.created_at.strftime("%Y-%m-%d %H:%M:%S"),
    }
    return ApiResponse(data=data)
