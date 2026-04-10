from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ApiResponse(BaseModel):
    """统一响应结构，前端默认按 code/message/data 解析。"""

    code: int = 0
    message: str = "success"
    data: dict[str, Any] | list[Any] | None = None


class LoginRequest(BaseModel):
    """登录接口请求体。"""

    # 登录方式，MVP 当前主要使用 mobile。
    loginType: str
    # 手机号，首次登录会自动注册。
    mobile: str
    # 短信验证码，当前 mock 登录不会校验真实验证码。
    verifyCode: str


class DreamInterpretRequest(BaseModel):
    """提交梦境解析时的请求体。"""

    # 用户输入的梦境原文，至少 10 个字。
    dreamText: str = Field(min_length=10)
    # 醒来后的主观感受。
    emotionAfterWaking: str | None = None
    # 梦里出现的人物标签。
    dreamPeople: list[str] | None = None
    # 梦里出现的意象或关键画面标签。
    dreamSymbols: list[str] | None = None


class DreamDeleteRequest(BaseModel):
    """删除梦境记录请求体。"""

    dreamRecordId: int


class DreamFollowupRequest(BaseModel):
    """提交追问回答请求体。"""

    # 对应梦境记录 ID。
    dreamRecordId: int
    # 当前展示给用户的追问问题。
    followupQuestion: str
    # 用户对追问问题的回答内容。
    userAnswer: str = Field(min_length=1)


class MoodCreateRequest(BaseModel):
    """创建心情记录请求体。"""

    moodType: Literal["开心", "平静", "焦虑", "疲惫", "难过", "烦躁", "迷茫"]
    moodIntensity: int = Field(ge=1, le=5)
    moodReason: str | None = Field(default=None, max_length=255)
    moodTags: list[str] | None = None


class SummaryGenerateRequest(BaseModel):
    """生成今日总结请求体。"""

    forceRegenerate: bool = False


class OrderCreateRequest(BaseModel):
    """创建订单请求体。"""

    productType: str
    planType: str | None = None
    payChannel: str


class FeedbackCreateRequest(BaseModel):
    """提交反馈请求体。"""

    targetType: str
    targetId: int
    feedbackType: str
    content: str | None = None


class EventLogCreateRequest(BaseModel):
    """提交前端埋点事件的请求体。"""

    eventName: Literal[
        "home_view",
        "dream_entry_click",
        "dream_submit",
        "dream_result_view",
        "followup_submit",
        "followup_result_view",
        "fortune_view",
        "history_view",
        "history_item_click",
        "membership_view",
        "payment_click",
        "payment_success",
    ]
    pageName: Literal["home", "input", "result", "history", "membership"]
    # created_at 已是服务端统一时间戳，这里只保留事件上下文字段。
    eventPayload: dict[str, Any] | list[Any] | None = None


class UserProfileData(BaseModel):
    """个人中心返回的基础资料结构。"""

    model_config = ConfigDict(from_attributes=True)

    userId: int
    nickname: str | None = None
    avatarUrl: str | None = None
    membershipStatus: str
    membershipExpireAt: datetime | None = None
    totalDreamCount: int
    consecutiveDays: int


class DreamListItem(BaseModel):
    """历史列表里单条梦境记录的展示结构。"""

    dreamRecordId: int
    date: date
    autoTitle: str | None = None
    # 历史记录里展示用户最初输入的梦境原文。
    dreamText: str | None = None
    tags: list[str] | None = None
    summary: str | None = None


class MembershipPlan(BaseModel):
    """会员方案结构。"""

    planType: str
    planName: str
    price: Decimal
    currency: str = "CNY"
