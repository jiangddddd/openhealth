from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import JSON, BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy import String, Text, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TimestampMixin:
    """通用时间字段，所有核心表都复用创建/更新时间。"""

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )


class User(Base, TimestampMixin):
    """用户主表，保存登录信息、基础资料和会员摘要。"""

    __tablename__ = "users"

    # 用户主键。
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    # 用户昵称，前端个人中心直接展示。
    nickname: Mapped[str | None] = mapped_column(String(50))
    # 头像地址，MVP 可为空。
    avatar_url: Mapped[str | None] = mapped_column(String(255))
    # 手机号登录的唯一标识。
    mobile: Mapped[str | None] = mapped_column(String(30), unique=True)
    # 预留邮箱登录能力。
    email: Mapped[str | None] = mapped_column(String(100), unique=True)
    # 当前登录方式，例如 mobile / wechat / google。
    login_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # 可选性别字段，后续可做个性化内容。
    gender: Mapped[str | None] = mapped_column(String(10))
    # 可选生日字段，后续可用于运势或轻命理玩法。
    birthday: Mapped[date | None] = mapped_column(Date)
    # 用户时区，便于生成“今日运势”一类按日期计算的内容。
    timezone: Mapped[str | None] = mapped_column(String(50))
    # 语言标识，例如 zh-CN。
    language: Mapped[str | None] = mapped_column(String(20))
    # 会员状态摘要，前端无需额外查订阅明细即可直接判断 free/pro。
    membership_status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'free'")
    )
    # 会员到期时间，供会员页和权限判断使用。
    membership_expire_at: Mapped[datetime | None] = mapped_column(DateTime)
    # 累计记录过多少条梦境。
    total_dream_count: Mapped[int] = mapped_column(
        nullable=False, server_default=text("0")
    )
    # 连续记录天数，当前为 MVP 摘要字段。
    consecutive_days: Mapped[int] = mapped_column(
        nullable=False, server_default=text("0")
    )
    # 最后一次登录时间。
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime)
    # 软删除标记，避免物理删除用户数据。
    is_deleted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("0")
    )

    wechat_mini_accounts: Mapped[list["WechatMiniAccount"]] = relationship(back_populates="user")
    dream_records: Mapped[list["DreamRecord"]] = relationship(back_populates="user")
    followups: Mapped[list["DreamFollowup"]] = relationship(back_populates="user")
    daily_fortunes: Mapped[list["DailyFortune"]] = relationship(back_populates="user")
    mood_records: Mapped[list["MoodRecord"]] = relationship(back_populates="user")
    daily_summaries: Mapped[list["DailySummary"]] = relationship(back_populates="user")
    memberships: Mapped[list["Membership"]] = relationship(back_populates="user")
    orders: Mapped[list["Order"]] = relationship(back_populates="user")
    feedbacks: Mapped[list["Feedback"]] = relationship(back_populates="user")
    prompt_logs: Mapped[list["PromptLog"]] = relationship(back_populates="user")
    event_logs: Mapped[list["EventLog"]] = relationship(back_populates="user")


class WechatMiniAccount(Base, TimestampMixin):
    """微信小程序账号表，保存 code2Session 结果和微信资料快照。"""

    __tablename__ = "wechat_mini_accounts"
    __table_args__ = (
        UniqueConstraint("app_id", "openid", name="uq_wechat_mini_accounts_app_openid"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=False, index=True
    )
    app_id: Mapped[str] = mapped_column(String(64), nullable=False)
    openid: Mapped[str] = mapped_column(String(100), nullable=False)
    unionid: Mapped[str | None] = mapped_column(String(100), index=True)
    session_key: Mapped[str | None] = mapped_column(String(255))
    session_key_updated_at: Mapped[datetime | None] = mapped_column(DateTime)
    nickname: Mapped[str | None] = mapped_column(String(100))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    gender: Mapped[int | None] = mapped_column(Integer)
    country: Mapped[str | None] = mapped_column(String(100))
    province: Mapped[str | None] = mapped_column(String(100))
    city: Mapped[str | None] = mapped_column(String(100))
    language: Mapped[str | None] = mapped_column(String(20))
    raw_session_data: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    raw_user_info: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime)

    user: Mapped["User"] = relationship(back_populates="wechat_mini_accounts")


class DreamRecord(Base, TimestampMixin):
    """梦境记录主表，保存用户原始输入和 AI 解析结果。"""

    __tablename__ = "dream_records"

    # 梦境记录主键。
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    # 记录所属用户。
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=False, index=True
    )
    # 用户输入的原始梦境文本。
    dream_text: Mapped[str] = mapped_column(Text, nullable=False)
    # 用户醒来后的主观感受。
    emotion_after_waking: Mapped[str | None] = mapped_column(String(30))
    # 梦里出现的人物列表，MVP 用 JSON 保存。
    dream_people: Mapped[list[str] | None] = mapped_column(JSON)
    # 梦里最深的意象或关键词列表。
    dream_symbols: Mapped[list[str] | None] = mapped_column(JSON)
    # AI 自动生成的标题，用于历史列表展示。
    auto_title: Mapped[str | None] = mapped_column(String(100))
    # 历史页和筛选页使用的标签。
    tags: Mapped[list[str] | None] = mapped_column(JSON)
    # 一句话摘要，列表页直接展示。
    summary: Mapped[str | None] = mapped_column(String(255))
    # 基础解梦结果，按 JSON 字符串保存。
    base_interpretation: Mapped[str | None] = mapped_column(Text)
    # 会员深度解梦结果。
    deep_interpretation: Mapped[str | None] = mapped_column(Text)
    # 结果模板版本，便于以后做 Prompt/结构升级。
    result_version: Mapped[str | None] = mapped_column(String(20))
    # 数据来源，当前主要是 manual，后续可扩展 voice/imported。
    source_type: Mapped[str | None] = mapped_column(String(20))
    # AI 结果是否成功生成。
    is_produced_success: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("0")
    )
    # 是否保留在历史记录中，删除时只做软隐藏。
    is_saved: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("1")
    )

    user: Mapped["User"] = relationship(back_populates="dream_records")
    followups: Mapped[list["DreamFollowup"]] = relationship(
        back_populates="dream_record"
    )


class DreamFollowup(Base, TimestampMixin):
    """梦境追问表，保存追问问题、用户回答和补充解析。"""

    __tablename__ = "dream_followups"

    # 追问记录主键。
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    # 关联的梦境记录。
    dream_record_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("dream_records.id"), nullable=False, index=True
    )
    # 追问所属用户。
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=False, index=True
    )
    # AI 生成的追问问题。
    followup_question: Mapped[str] = mapped_column(String(255), nullable=False)
    # 用户对追问的回答。
    user_answer: Mapped[str | None] = mapped_column(Text)
    # AI 根据回答生成的补充解析。
    followup_interpretation: Mapped[str | None] = mapped_column(Text)
    # 第几轮追问，当前 MVP 固定为 1。
    round_no: Mapped[int] = mapped_column(nullable=False, server_default=text("1"))

    dream_record: Mapped["DreamRecord"] = relationship(back_populates="followups")
    user: Mapped["User"] = relationship(back_populates="followups")


class DailyFortune(Base, TimestampMixin):
    """每日运势表，按用户和日期缓存当天生成内容。"""

    __tablename__ = "daily_fortunes"
    __table_args__ = (UniqueConstraint("user_id", "fortune_date", name="uq_user_date"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=False, index=True
    )
    fortune_date: Mapped[date] = mapped_column(Date, nullable=False)
    overall_status: Mapped[str | None] = mapped_column(String(255))
    reminder_text: Mapped[str | None] = mapped_column(Text)
    love_text: Mapped[str | None] = mapped_column(String(255))
    career_text: Mapped[str | None] = mapped_column(String(255))
    self_text: Mapped[str | None] = mapped_column(String(255))
    good_for: Mapped[list[str] | None] = mapped_column(JSON)
    avoid_for: Mapped[list[str] | None] = mapped_column(JSON)
    lucky_color: Mapped[str | None] = mapped_column(String(50))
    lucky_time: Mapped[str | None] = mapped_column(String(50))
    full_content: Mapped[str | None] = mapped_column(Text)
    is_pro_content: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("0")
    )

    user: Mapped["User"] = relationship(back_populates="daily_fortunes")


class MoodRecord(Base, TimestampMixin):
    """心情记录表，保存用户每次提交的主观情绪快照。"""

    __tablename__ = "mood_records"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=False, index=True
    )
    # 记录归属的自然日，便于按“今日状态”聚合查询。
    record_date: Mapped[date] = mapped_column(Date, nullable=False)
    # 当前主情绪，例如开心 / 焦虑 / 疲惫。
    mood_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # 情绪强度，范围 1~5。
    mood_intensity: Mapped[int] = mapped_column(nullable=False)
    # 一句话原因，帮助总结更贴近当天处境。
    mood_reason: Mapped[str | None] = mapped_column(String(255))
    # 原因标签，MVP 先用 JSON 保存。
    mood_tags: Mapped[list[str] | None] = mapped_column(JSON)

    user: Mapped["User"] = relationship(back_populates="mood_records")


class DailySummary(Base, TimestampMixin):
    """每日总结表，缓存每天生成的总结与饮食建议。"""

    __tablename__ = "daily_summaries"
    __table_args__ = (
        UniqueConstraint("user_id", "summary_date", name="uq_user_summary_date"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=False, index=True
    )
    summary_date: Mapped[date] = mapped_column(Date, nullable=False)
    overall_status: Mapped[str] = mapped_column(Text, nullable=False)
    main_factors: Mapped[str] = mapped_column(Text, nullable=False)
    attention_point: Mapped[str] = mapped_column(Text, nullable=False)
    reminder: Mapped[str] = mapped_column(Text, nullable=False)
    diet_direction: Mapped[str] = mapped_column(Text, nullable=False)
    eat_more: Mapped[list[str] | None] = mapped_column(JSON)
    eat_less: Mapped[list[str] | None] = mapped_column(JSON)
    diet_tip: Mapped[str] = mapped_column(Text, nullable=False)
    # 保存生成总结时使用的关键上下文，便于排查与升级。
    source_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'success'")
    )

    user: Mapped["User"] = relationship(back_populates="daily_summaries")


class Order(Base, TimestampMixin):
    """订单表，保存会员或报告类商品的支付订单。"""

    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=False, index=True
    )
    order_no: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    product_type: Mapped[str] = mapped_column(String(30), nullable=False)
    product_name: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(
        String(10), nullable=False, server_default=text("'CNY'")
    )
    pay_status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'unpaid'")
    )
    pay_channel: Mapped[str | None] = mapped_column(String(30))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime)

    user: Mapped["User"] = relationship(back_populates="orders")
    memberships: Mapped[list["Membership"]] = relationship(back_populates="order")


class Membership(Base, TimestampMixin):
    """会员订阅表，一条记录代表一段有效会员周期。"""

    __tablename__ = "memberships"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=False, index=True
    )
    plan_type: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    start_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expire_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    auto_renew: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("0")
    )
    source_channel: Mapped[str | None] = mapped_column(String(30))
    order_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("orders.id"))

    user: Mapped["User"] = relationship(back_populates="memberships")
    order: Mapped[Order | None] = relationship(back_populates="memberships")


class Feedback(Base):
    """用户反馈表，收集喜欢/不喜欢/建议等运营数据。"""

    __tablename__ = "feedbacks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=False, index=True
    )
    target_type: Mapped[str] = mapped_column(String(20), nullable=False)
    target_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    feedback_type: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="feedbacks")


class PromptLog(Base):
    """Prompt 调用日志表，记录大模型入参、出参和状态。"""

    __tablename__ = "prompt_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id"), index=True
    )
    business_type: Mapped[str] = mapped_column(String(30), nullable=False)
    prompt_version: Mapped[str | None] = mapped_column(String(20))
    input_payload: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    output_payload: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    user: Mapped[User | None] = relationship(back_populates="prompt_logs")


class EventLog(Base):
    """用户埋点日志表，记录页面行为与附加上下文。"""

    __tablename__ = "event_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id"), index=True
    )
    event_name: Mapped[str] = mapped_column(String(50), nullable=False)
    page_name: Mapped[str] = mapped_column(String(50), nullable=False)
    event_payload: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    user: Mapped[User | None] = relationship(back_populates="event_logs")
