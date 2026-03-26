from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models import DailyFortune, DreamFollowup, DreamRecord, EventLog, Feedback, Order, User
from app.services.content_generator import generate_base_interpretation
from app.services.content_generator import generate_deep_interpretation
from app.services.content_generator import generate_followup_interpretation
from app.services.content_generator import generate_followup_question
from app.services.content_generator import generate_fortune
from app.services.content_generator import generate_title_tags_summary


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
        )
        db.add(user)
        db.flush()

    user.last_login_at = datetime.now()
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
    user.consecutive_days = max(user.consecutive_days, 1)

    db.commit()
    db.refresh(dream)
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

    today = date.today()
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
