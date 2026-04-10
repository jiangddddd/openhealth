from __future__ import annotations

import json
import logging
from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models import DailyFortune, DailySummary, DreamFollowup, DreamRecord, EventLog
from app.models import Feedback, MoodRecord, Order, User, WechatMiniAccount
from app.services.daily_summary_generator import build_daily_summary
from app.services.content_generator import generate_base_interpretation
from app.services.content_generator import generate_deep_interpretation
from app.services.content_generator import generate_followup_interpretation
from app.services.content_generator import generate_followup_question
from app.services.content_generator import generate_fortune
from app.services.content_generator import generate_title_tags_summary

logger = logging.getLogger(__name__)


def _get_user_timezone(user: User) -> ZoneInfo:
    """解析用户时区；若未配置或非法则回退到亚洲/上海。"""

    timezone_name = user.timezone or "Asia/Shanghai"
    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        return ZoneInfo("Asia/Shanghai")


def _get_user_today(user: User) -> date:
    """按用户时区计算当前自然日。"""

    return datetime.now(_get_user_timezone(user)).date()


def _refresh_user_consecutive_days(db: Session, user: User) -> None:
    """根据梦境记录和心情记录重算连续记录天数。"""

    dream_dates = {
        item.created_at.date()
        for item in db.query(DreamRecord)
        .filter(DreamRecord.user_id == user.id, DreamRecord.is_saved.is_(True))
        .all()
    }
    mood_dates = {
        item.record_date
        for item in db.query(MoodRecord).filter(MoodRecord.user_id == user.id).all()
    }
    active_dates = dream_dates | mood_dates
    if not active_dates:
        user.consecutive_days = 0
        return

    streak = 0
    cursor = _get_user_today(user)
    while cursor in active_dates:
        streak += 1
        cursor = cursor.fromordinal(cursor.toordinal() - 1)
    user.consecutive_days = streak


def create_or_login_user(db: Session, mobile: str, login_type: str) -> tuple[User, bool]:
    """手机号登录入口；如果用户不存在则自动注册。"""

    user = db.query(User).filter(User.mobile == mobile, User.is_deleted.is_(False)).first()
    is_new_user = False
    if not user:
        is_new_user = True
        user = User(
            mobile=mobile,
            login_type=login_type,
            nickname=f"用户{mobile[-4:]}",
            membership_status="free",
            language="zh-CN",
            timezone="Asia/Shanghai",
        )
        db.add(user)
        db.flush()

    user.last_login_at = datetime.now()
    db.commit()
    db.refresh(user)
    return user, is_new_user


def create_or_login_user_by_wechat(
    db: Session,
    openid: str,
    unionid: str | None = None,
    session_key: str | None = None,
    nickname: str | None = None,
    avatar_url: str | None = None,
) -> tuple[User, bool]:
    account = db.query(WechatMiniAccount).filter(WechatMiniAccount.openid == openid).first()
    is_new_user = False

    if account:
        user = db.get(User, account.user_id)
        if not user or user.is_deleted:
            raise ValueError("User bound to wechat account is not available")
    else:
        is_new_user = True
        user = User(
            login_type="wechat",
            nickname=(nickname or f"微信用户{openid[-6:]}")[:50],
            avatar_url=avatar_url,
            membership_status="free",
            language="zh-CN",
            timezone="Asia/Shanghai",
        )
        db.add(user)
        db.flush()

        account = WechatMiniAccount(
            user_id=user.id,
            openid=openid,
            unionid=unionid,
            session_key=session_key,
        )
        db.add(account)

    if nickname:
        user.nickname = nickname[:50]
    if avatar_url:
        user.avatar_url = avatar_url[:255]
    user.login_type = "wechat"
    user.last_login_at = datetime.now()

    if unionid:
        account.unionid = unionid
    if session_key:
        account.session_key = session_key

    db.commit()
    db.refresh(user)
    return user, is_new_user


def build_profile_data(user: User) -> dict:
    """把用户 ORM 对象转换为前端个人中心需要的结构。"""

    return {
        "userId": user.id,
        "nickname": user.nickname,
        "avatarUrl": user.avatar_url,
        "membershipStatus": user.membership_status,
        "membershipExpireAt": user.membership_expire_at,
        "totalDreamCount": user.total_dream_count,
        "consecutiveDays": user.consecutive_days,
    }


def create_dream_interpretation(
    db: Session,
    user: User,
    dream_text: str,
    emotion_after_waking: str | None,
    dream_people: list[str] | None,
    dream_symbols: list[str] | None,
) -> dict:
    """创建梦境记录，并同步生成标题、基础解析和第一轮追问。"""

    title_pack = generate_title_tags_summary(
        dream_text=dream_text,
        emotion_after_waking=emotion_after_waking,
        dream_symbols=dream_symbols,
        user_id=user.id,
    )
    base_interpretation = generate_base_interpretation(
        dream_text=dream_text,
        emotion_after_waking=emotion_after_waking,
        dream_people=dream_people,
        dream_symbols=dream_symbols,
        user_id=user.id,
    )
    followup_question = generate_followup_question(
        dream_text=dream_text,
        emotion_after_waking=emotion_after_waking,
        dream_people=dream_people,
        dream_symbols=dream_symbols,
        user_id=user.id,
    )

    # 一次提交会同时落库原始梦境、基础解析和可选的深度解析。
    dream = DreamRecord(
        user_id=user.id,
        dream_text=dream_text,
        emotion_after_waking=emotion_after_waking,
        dream_people=dream_people,
        dream_symbols=dream_symbols,
        auto_title=title_pack["auto_title"],
        tags=title_pack["tags"],
        summary=title_pack["summary"],
        base_interpretation=json.dumps(base_interpretation, ensure_ascii=False),
        deep_interpretation=generate_deep_interpretation(
            dream_text, emotion_after_waking, dream_people, dream_symbols, user.id
        )
        if user.membership_status == "pro"
        else None,
        result_version="v1",
        source_type="manual",
        is_produced_success=True,
        is_saved=True,
    )
    db.add(dream)
    db.flush()

    # MVP 固定只创建一轮追问。
    followup = DreamFollowup(
        dream_record_id=dream.id,
        user_id=user.id,
        followup_question=followup_question,
        round_no=1,
    )
    db.add(followup)

    user.total_dream_count += 1
    _refresh_user_consecutive_days(db, user)

    db.commit()
    db.refresh(dream)
    _refresh_today_summary_after_record(db, user)
    return {
        "dreamRecordId": dream.id,
        "autoTitle": dream.auto_title,
        "tags": dream.tags,
        "summary": dream.summary,
        "baseInterpretation": base_interpretation,
        "followupQuestion": followup_question,
        "membershipInfo": {
            "membershipStatus": user.membership_status,
            "canViewDeepInterpretation": user.membership_status == "pro",
        },
    }


def get_dream_detail(db: Session, user_id: int, dream_record_id: int) -> DreamRecord | None:
    """按用户维度查询单条梦境详情，防止越权读取。"""

    return (
        db.query(DreamRecord)
        .filter(DreamRecord.id == dream_record_id, DreamRecord.user_id == user_id)
        .first()
    )


def list_dreams(db: Session, user_id: int, page_no: int, page_size: int) -> dict:
    """分页查询历史梦境列表，供历史页展示。"""

    query = (
        db.query(DreamRecord)
        .filter(DreamRecord.user_id == user_id, DreamRecord.is_saved.is_(True))
        .order_by(desc(DreamRecord.created_at))
    )
    total = query.count()
    items = query.offset((page_no - 1) * page_size).limit(page_size).all()
    result = [
        {
            "dreamRecordId": item.id,
            "date": item.created_at.date(),
            "autoTitle": item.auto_title,
            "dreamText": item.dream_text,
            "tags": item.tags,
            "summary": item.summary,
        }
        for item in items
    ]
    return {
        "list": result,
        "pageNo": page_no,
        "pageSize": page_size,
        "total": total,
        "hasMore": page_no * page_size < total,
    }


def delete_dream(db: Session, user_id: int, dream_record_id: int) -> bool:
    """软删除梦境记录，仅隐藏历史，不物理删除数据。"""

    dream = get_dream_detail(db, user_id, dream_record_id)
    if not dream:
        return False
    dream.is_saved = False
    db.commit()
    return True


def _build_mood_data(record: MoodRecord) -> dict:
    """把心情记录 ORM 对象转换成接口返回结构。"""

    return {
        "moodRecordId": record.id,
        "recordDate": record.record_date,
        "moodType": record.mood_type,
        "moodIntensity": record.mood_intensity,
        "moodReason": record.mood_reason,
        "moodTags": record.mood_tags or [],
        "createdAt": record.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        "updatedAt": record.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
    }


def create_mood_record(
    db: Session,
    user: User,
    mood_type: str,
    mood_intensity: int,
    mood_reason: str | None,
    mood_tags: list[str] | None,
) -> dict:
    """创建一条新的心情记录，允许同一天保存多次情绪变化。"""

    today = _get_user_today(user)
    mood_record = MoodRecord(
        user_id=user.id,
        record_date=today,
        mood_type=mood_type,
        mood_intensity=mood_intensity,
        mood_reason=mood_reason,
        mood_tags=mood_tags,
    )
    db.add(mood_record)
    db.flush()

    _refresh_user_consecutive_days(db, user)
    db.commit()
    db.refresh(mood_record)
    _refresh_today_summary_after_record(db, user)
    return _build_mood_data(mood_record)


def get_today_mood_record(db: Session, user: User) -> MoodRecord | None:
    """获取用户当天最新的心情快照。"""

    today = _get_user_today(user)
    return (
        db.query(MoodRecord)
        .filter(MoodRecord.user_id == user.id, MoodRecord.record_date == today)
        .order_by(desc(MoodRecord.created_at), desc(MoodRecord.id))
        .first()
    )


def list_mood_records(
    db: Session,
    user_id: int,
    page_no: int,
    page_size: int,
    mood_type: str | None = None,
) -> dict:
    """分页查询心情历史列表。"""

    query = db.query(MoodRecord).filter(MoodRecord.user_id == user_id)
    if mood_type:
        query = query.filter(MoodRecord.mood_type == mood_type)

    query = query.order_by(desc(MoodRecord.record_date), desc(MoodRecord.created_at), desc(MoodRecord.id))
    total = query.count()
    items = query.offset((page_no - 1) * page_size).limit(page_size).all()
    return {
        "list": [_build_mood_data(item) for item in items],
        "pageNo": page_no,
        "pageSize": page_size,
        "total": total,
        "hasMore": page_no * page_size < total,
    }


def _build_summary_data(summary: DailySummary) -> dict:
    """把每日总结 ORM 对象转换成接口返回结构。"""

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


def get_today_summary(db: Session, user: User) -> DailySummary | None:
    """获取用户当天已经生成的总结。"""

    today = _get_user_today(user)
    return (
        db.query(DailySummary)
        .filter(DailySummary.user_id == user.id, DailySummary.summary_date == today)
        .first()
    )


def _collect_today_summary_context(db: Session, user: User) -> tuple[list[dict], list[dict]]:
    """收集生成今日总结所需的当天心情和梦境上下文。"""

    today = _get_user_today(user)
    start_at = datetime.combine(today, datetime.min.time())
    end_at = datetime.combine(today, datetime.max.time())

    moods = (
        db.query(MoodRecord)
        .filter(MoodRecord.user_id == user.id, MoodRecord.record_date == today)
        .order_by(MoodRecord.created_at.asc())
        .all()
    )
    dreams = (
        db.query(DreamRecord)
        .filter(
            DreamRecord.user_id == user.id,
            DreamRecord.is_saved.is_(True),
            DreamRecord.created_at >= start_at,
            DreamRecord.created_at <= end_at,
        )
        .order_by(DreamRecord.created_at.asc())
        .all()
    )

    mood_payload = [
        {
            "moodType": item.mood_type,
            "moodIntensity": item.mood_intensity,
            "moodReason": item.mood_reason,
            "moodTags": item.mood_tags or [],
        }
        for item in moods
    ]
    dream_payload = [
        {
            "dreamRecordId": item.id,
            "summary": item.summary,
            "tags": item.tags or [],
            "emotionAfterWaking": item.emotion_after_waking,
        }
        for item in dreams
    ]
    return mood_payload, dream_payload


def generate_today_summary(
    db: Session,
    user: User,
    force_regenerate: bool = False,
) -> dict | None:
    """生成或读取当天总结，默认复用已生成结果。"""

    existing = get_today_summary(db, user)
    if existing and not force_regenerate:
        return _build_summary_data(existing)

    mood_payload, dream_payload = _collect_today_summary_context(db, user)
    if not mood_payload and not dream_payload:
        return None

    summary_payload = build_daily_summary(
        summary_date=_get_user_today(user),
        moods=mood_payload,
        dreams=dream_payload,
    )

    summary = existing or DailySummary(user_id=user.id, summary_date=_get_user_today(user))
    if not existing:
        db.add(summary)

    summary.overall_status = summary_payload["overallStatus"]
    summary.main_factors = summary_payload["mainFactors"]
    summary.attention_point = summary_payload["attentionPoint"]
    summary.reminder = summary_payload["reminder"]
    summary.diet_direction = summary_payload["dietAdvice"]["direction"]
    summary.eat_more = summary_payload["dietAdvice"]["eatMore"]
    summary.eat_less = summary_payload["dietAdvice"]["eatLess"]
    summary.diet_tip = summary_payload["dietAdvice"]["tip"]
    summary.source_snapshot = summary_payload["sourceSnapshot"]
    summary.status = "success"

    db.commit()
    db.refresh(summary)
    return _build_summary_data(summary)


def _refresh_today_summary_after_record(db: Session, user: User) -> None:
    """新记录入库后，自动用最新上下文覆盖当天总结。"""

    try:
        generate_today_summary(db=db, user=user, force_regenerate=True)
    except Exception:
        # 总结刷新失败不应影响梦境/心情主流程，保留原始记录成功结果。
        logger.exception("Failed to refresh today's summary after new record, user_id=%s", user.id)


def get_home_overview(db: Session, user: User) -> dict:
    """聚合首页需要的今日总结、最近梦境和最近心情。"""

    today_summary = get_today_summary(db, user)
    latest_dream = (
        db.query(DreamRecord)
        .filter(DreamRecord.user_id == user.id, DreamRecord.is_saved.is_(True))
        .order_by(desc(DreamRecord.created_at))
        .first()
    )
    latest_mood = (
        db.query(MoodRecord)
        .filter(MoodRecord.user_id == user.id)
        .order_by(desc(MoodRecord.record_date), desc(MoodRecord.created_at), desc(MoodRecord.id))
        .first()
    )

    return {
        "todaySummary": (
            {
                "summaryId": today_summary.id,
                "summaryDate": today_summary.summary_date,
                "overallStatus": today_summary.overall_status,
                "reminder": today_summary.reminder,
                "createdAt": today_summary.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "updatedAt": today_summary.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
            }
            if today_summary
            else None
        ),
        "todayDietAdvice": (
            {
                "direction": today_summary.diet_direction,
                "tip": today_summary.diet_tip,
            }
            if today_summary
            else None
        ),
        "latestDream": (
            {
                "dreamRecordId": latest_dream.id,
                "title": latest_dream.auto_title,
                "summary": latest_dream.summary,
                "createdAt": latest_dream.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            }
            if latest_dream
            else None
        ),
        "latestMood": (_build_mood_data(latest_mood) if latest_mood else None),
        "consecutiveDays": user.consecutive_days,
    }


def list_daily_summaries(
    db: Session,
    user_id: int,
    page_no: int,
    page_size: int,
) -> dict:
    """分页查询每日总结历史。"""

    query = (
        db.query(DailySummary)
        .filter(DailySummary.user_id == user_id)
        .order_by(desc(DailySummary.summary_date), desc(DailySummary.updated_at))
    )
    total = query.count()
    items = query.offset((page_no - 1) * page_size).limit(page_size).all()
    return {
        "list": [_build_summary_data(item) for item in items],
        "pageNo": page_no,
        "pageSize": page_size,
        "total": total,
        "hasMore": page_no * page_size < total,
    }


def submit_followup(
    db: Session,
    user: User,
    dream_record_id: int,
    followup_question: str,
    user_answer: str,
) -> dict | None:
    """保存追问回答，并生成补充解析结果。"""

    followup = (
        db.query(DreamFollowup)
        .filter(
            DreamFollowup.dream_record_id == dream_record_id,
            DreamFollowup.user_id == user.id,
            DreamFollowup.followup_question == followup_question,
        )
        .order_by(desc(DreamFollowup.created_at))
        .first()
    )
    if not followup:
        return None

    dream = get_dream_detail(db, user.id, dream_record_id)
    if not dream:
        return None

    # 使用原始梦境 + 当前追问回答，生成更贴近用户状态的补充解析。
    interpretation = generate_followup_interpretation(
        dream_text=dream.dream_text,
        emotion_after_waking=dream.emotion_after_waking,
        dream_people=dream.dream_people,
        dream_symbols=dream.dream_symbols,
        followup_question=followup_question,
        user_answer=user_answer,
        user_id=user.id,
    )
    followup.user_answer = user_answer
    followup.followup_interpretation = json.dumps(interpretation, ensure_ascii=False)
    db.commit()

    return {
        "followupId": followup.id,
        "followupInterpretation": interpretation,
        "membershipInfo": {
            "membershipStatus": user.membership_status,
            "canViewDeepInterpretation": user.membership_status == "pro",
            "upgradeHint": "解锁深度分析，可查看更多情绪根源与行动建议。",
        },
    }


def get_or_create_fortune(db: Session, user: User) -> dict:
    """获取当天运势；如果当天还没生成，则根据最近梦境动态生成。"""

    today = _get_user_today(user)
    fortune = (
        db.query(DailyFortune)
        .filter(DailyFortune.user_id == user.id, DailyFortune.fortune_date == today)
        .first()
    )
    if not fortune:
        recent_records = (
            db.query(DreamRecord)
            .filter(DreamRecord.user_id == user.id)
            .order_by(desc(DreamRecord.created_at))
            .limit(5)
            .all()
        )
        recent_keywords = []
        recent_emotions = []
        for record in recent_records:
            recent_keywords.extend(record.tags or [])
            if record.emotion_after_waking:
                recent_emotions.append(record.emotion_after_waking)

        # 运势生成会参考最近几条梦境的标签和情绪摘要。
        payload = generate_fortune(
            fortune_date=today,
            recent_keywords=recent_keywords[:5],
            recent_emotions=recent_emotions[:5],
            is_pro=user.membership_status == "pro",
            user_id=user.id,
        )
        fortune = DailyFortune(
            user_id=user.id,
            fortune_date=today,
            overall_status=payload["overallStatus"],
            reminder_text=payload["reminderText"],
            love_text=payload["loveText"],
            career_text=payload["careerText"],
            self_text=payload["selfText"],
            good_for=payload["goodFor"],
            avoid_for=payload["avoidFor"],
            lucky_color=payload["luckyColor"],
            lucky_time=payload["luckyTime"],
            full_content=payload["fullContent"],
            is_pro_content=payload["isProContent"],
        )
        db.add(fortune)
        db.commit()
        db.refresh(fortune)

    return {
        "fortuneDate": fortune.fortune_date,
        "overallStatus": fortune.overall_status,
        "reminderText": fortune.reminder_text,
        "loveText": fortune.love_text,
        "careerText": fortune.career_text,
        "selfText": fortune.self_text,
        "goodFor": fortune.good_for,
        "avoidFor": fortune.avoid_for,
        "luckyColor": fortune.lucky_color,
        "luckyTime": fortune.lucky_time,
        "isProContent": fortune.is_pro_content,
    }


def get_membership_info(user: User) -> dict:
    """返回会员页展示所需的状态、方案和权益说明。"""

    return {
        "membershipStatus": user.membership_status,
        "expireAt": user.membership_expire_at,
        "plans": [
            {
                "planType": "monthly",
                "planName": "月度 Pro",
                "price": "28.00",
                "currency": "CNY",
            },
            {
                "planType": "yearly",
                "planName": "年度 Pro",
                "price": "168.00",
                "currency": "CNY",
            },
        ],
        "benefits": ["无限次解梦", "深度解析", "完整历史记录", "每周梦境总结"],
    }


def create_order(
    db: Session,
    user: User,
    product_type: str,
    plan_type: str | None,
    pay_channel: str,
) -> dict:
    """创建会员订单，当前返回 mock 支付参数。"""

    now = datetime.now()
    amount = Decimal("28.00") if plan_type == "monthly" else Decimal("168.00")
    product_name = "月度 Pro" if plan_type == "monthly" else "年度 Pro"
    order_no = f"ORD{now.strftime('%Y%m%d%H%M%S')}{user.id}"
    order = Order(
        user_id=user.id,
        order_no=order_no,
        product_type=product_type,
        product_name=product_name,
        amount=amount,
        pay_channel=pay_channel,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return {
        "orderId": order.id,
        "orderNo": order.order_no,
        "amount": f"{order.amount:.2f}",
        "payParams": {"prepayId": f"mock_{order.order_no}"},
    }


def get_order_detail(db: Session, user_id: int, order_id: int) -> Order | None:
    """按用户维度查询订单详情。"""

    return (
        db.query(Order)
        .filter(Order.id == order_id, Order.user_id == user_id)
        .first()
    )


def create_feedback(
    db: Session,
    user: User,
    target_type: str,
    target_id: int,
    feedback_type: str,
    content: str | None,
) -> None:
    """保存用户对内容结果的反馈。"""

    feedback = Feedback(
        user_id=user.id,
        target_type=target_type,
        target_id=target_id,
        feedback_type=feedback_type,
        content=content,
    )
    db.add(feedback)
    db.commit()


def create_event_log(
    db: Session,
    user: User | None,
    event_name: str,
    page_name: str,
    event_payload: dict | list | None,
) -> int:
    """保存前端埋点事件，便于后续做行为分析和漏斗统计。"""

    event_log = EventLog(
        user_id=user.id if user else None,
        event_name=event_name,
        page_name=page_name,
        event_payload=event_payload,
    )
    db.add(event_log)
    db.commit()
    db.refresh(event_log)
    return event_log.id
