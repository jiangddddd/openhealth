from __future__ import annotations

from datetime import date
import logging

from app.services.qwen_client import qwen_client

logger = logging.getLogger(__name__)


STYLE_RULES = """
你是一个温和、清晰、克制、带一点神秘感的内容顾问。
不要使用恐吓、宿命论或绝对化表达。
不要使用“命中注定”“一定会发生”等说法。
更关注用户的情绪、状态和自我理解。
输出适合移动端阅读，语言自然、简洁。
""".strip()


def _pick_first(values: list[str] | None, fallback: str) -> str:
    if values:
        return values[0]
    return fallback


def _dream_context(
    dream_text: str,
    emotion_after_waking: str | None = None,
    dream_people: list[str] | None = None,
    dream_symbols: list[str] | None = None,
) -> str:
    """把梦境相关输入拼成统一上下文，供 Prompt 直接复用。"""

    return (
        f"梦境内容：{dream_text}\n"
        f"醒来后的感觉：{emotion_after_waking or '未提供'}\n"
        f"梦里出现的人：{'、'.join(dream_people or ['未提供'])}\n"
        f"最深画面或意象：{'、'.join(dream_symbols or ['未提供'])}"
    )


def _to_display_text(value) -> str:
    """把模型可能返回的任意值转换成适合前端展示的文本。"""

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


def _to_string_list(value) -> list[str]:
    """把模型返回值尽量归一化成字符串数组，降低前端渲染风险。"""

    if value is None:
        return []
    if isinstance(value, list):
        return [_to_display_text(item) for item in value if _to_display_text(item)]
    text = _to_display_text(value)
    return [text] if text else []


def _normalize_base_interpretation(payload: dict) -> dict:
    """标准化基础解梦结构，确保字段类型固定。"""

    return {
        "conclusion": _to_display_text(payload.get("conclusion")),
        "symbols": _to_display_text(payload.get("symbols")),
        "mapping": _to_display_text(payload.get("mapping")),
        "reminder": _to_display_text(payload.get("reminder")),
        "goodFor": _to_string_list(payload.get("goodFor")),
        "avoidFor": _to_string_list(payload.get("avoidFor")),
    }


def _normalize_followup_interpretation(payload: dict) -> dict:
    """标准化追问补充解析结构。"""

    return {
        "closerState": _to_display_text(payload.get("closerState")),
        "deeperReason": _to_display_text(payload.get("deeperReason")),
        "suggestion": _to_display_text(payload.get("suggestion")),
    }


def _fallback_title_tags_summary(
    dream_text: str,
    emotion_after_waking: str | None,
    dream_symbols: list[str] | None,
) -> dict:
    first_symbol = _pick_first(dream_symbols, "梦境")
    title = f"关于{first_symbol}的梦"
    tags = list(
        dict.fromkeys((dream_symbols or []) + ([emotion_after_waking] if emotion_after_waking else []))
    )[:4]
    summary = "最近可能有一件事让你持续不踏实，梦把这种感受放大了。"
    return {
        "auto_title": title,
        "tags": tags,
        "summary": summary,
    }


def _fallback_base_interpretation(
    dream_text: str,
    emotion_after_waking: str | None,
    dream_people: list[str] | None,
    dream_symbols: list[str] | None,
) -> dict:
    symbol_text = "、".join(dream_symbols or ["梦里的片段"])
    people_text = "、".join(dream_people or ["没有特别的人"])
    emotion_text = emotion_after_waking or "复杂"
    return {
        "conclusion": "你最近可能正处在想弄清某件事、但内心还没有完全稳定下来的阶段。",
        "symbols": f"{symbol_text}更像是一种潜意识提醒，说明你正在反复感受某种没有被彻底消化的情绪。",
        "mapping": f"这类梦常出现在现实里有压力、关系牵动，或对方向感不够明确的时候。梦里出现的对象包括{people_text}，说明你对外部关系也有一些在意。",
        "reminder": f"你醒来后的感受偏{emotion_text}，与其急着得出结论，不如先分清楚真正让你消耗的那件事。",
        "goodFor": ["梳理任务", "留意情绪", "提前休息"],
        "avoidFor": ["冲动决定", "过度内耗", "情绪争论"],
    }


def _fallback_followup_question(
    dream_text: str,
    emotion_after_waking: str | None,
    dream_people: list[str] | None,
    dream_symbols: list[str] | None,
) -> str:
    if emotion_after_waking in {"焦虑", "害怕", "迷茫"}:
        return "你最近现实里也有一件事迟迟定不下来吗？"
    if dream_people and "前任" in dream_people:
        return "最近有一段关系，仍在牵动你的情绪吗？"
    if dream_symbols and "考试" in dream_symbols:
        return "你最近是不是总担心自己做得还不够好？"
    return "这个梦最让你放不下的感觉，像不像现实里的某件事？"


def _fallback_followup_interpretation(user_answer: str) -> dict:
    return {
        "closerState": "这次补充后，梦更像是在映射你现实中的拉扯感，而不只是单纯情绪波动。",
        "deeperReason": f"你提到“{user_answer[:20]}”，说明你在意的并不是表面的结果，而是结果背后的失控感与不确定感。",
        "suggestion": "先把最在意的风险和最想获得的东西分别写下来，你会更容易看清真正的选择重点。",
    }


def _fallback_deep_interpretation(
    dream_text: str,
    emotion_after_waking: str | None,
    dream_people: list[str] | None,
    dream_symbols: list[str] | None,
) -> str:
    return (
        "【这次梦最核心的信号】你正在经历一种需要重新确认内在秩序的阶段。"
        "【潜在情绪模式】你可能习惯先撑住情绪，再慢慢消化压力。"
        "【现实牵引】外部关系、任务节奏或未来选择正在持续影响你。"
        "【你最近的内在课题】如何在不确定里找到自己的节奏。"
        "【给你的建议】先稳定日常节奏，再处理关键选择。"
        "【一句收束】梦没有替你下结论，它只是提醒你，内心已经在发出信号。"
    )


def _fallback_fortune(
    fortune_date: date,
    recent_keywords: list[str] | None = None,
    recent_emotions: list[str] | None = None,
    is_pro: bool = False,
) -> dict:
    keyword_text = "、".join(recent_keywords or ["整理", "节奏"]) or "整理"
    emotion_text = "、".join(recent_emotions or ["敏感"]) or "敏感"
    overall = f"今天整体状态偏平稳，但你对{keyword_text}相关的事情会更敏感。"
    reminder = f"近期情绪关键词偏向{emotion_text}，适合先整理想法，不适合在情绪上头时做决定。"
    return {
        "fortuneDate": str(fortune_date),
        "overallStatus": overall,
        "reminderText": reminder,
        "loveText": "关系里适合先观察情绪，再表达需求。",
        "careerText": "工作或学习上适合先完成最关键的一件事。",
        "selfText": "今天更适合给自己留一点喘息空间。",
        "goodFor": ["整理", "复盘", "早睡"],
        "avoidFor": ["冲动沟通", "拖延", "过度内耗"],
        "luckyColor": "浅蓝色",
        "luckyTime": "19:00-21:00",
        "fullContent": reminder + " 如果你愿意放慢一点节奏，今天会更顺。",
        "isProContent": is_pro,
    }


def generate_title_tags_summary(
    dream_text: str,
    emotion_after_waking: str | None,
    dream_symbols: list[str] | None,
    user_id: int | None = None,
) -> dict:
    """生成梦境标题、标签和一句话摘要。"""

    try:
        result = qwen_client.chat_json(
            business_type="dream_title",
            system_prompt=STYLE_RULES,
            user_prompt=(
                "请根据以下梦境信息生成 JSON，字段为 auto_title、tags、summary。\n"
                "要求：auto_title 是自然简短标题；tags 为 2-4 个标签数组；summary 不超过 30 字。\n"
                f"{_dream_context(dream_text, emotion_after_waking, None, dream_symbols)}"
            ),
            user_id=user_id,
        )
        return {
            "auto_title": result.get("auto_title") or result.get("title") or "关于梦境的记录",
            "tags": _to_string_list(result.get("tags"))[:4],
            "summary": _to_display_text(result.get("summary"))
            or "这次梦境像是在提醒你留意近期的内心状态。",
        }
    except Exception:
        logger.warning("Falling back to mock title/tags generation")
        return _fallback_title_tags_summary(dream_text, emotion_after_waking, dream_symbols)


def generate_base_interpretation(
    dream_text: str,
    emotion_after_waking: str | None,
    dream_people: list[str] | None,
    dream_symbols: list[str] | None,
    user_id: int | None = None,
) -> dict:
    """生成基础解梦结果。"""

    try:
        result = qwen_client.chat_json(
            business_type="dream_base",
            system_prompt=STYLE_RULES,
            user_prompt=(
                "请根据以下梦境信息输出 JSON，字段固定为 conclusion、symbols、mapping、reminder、goodFor、avoidFor。\n"
                "goodFor 和 avoidFor 必须是数组，各 2-3 项。\n"
                f"{_dream_context(dream_text, emotion_after_waking, dream_people, dream_symbols)}"
            ),
            user_id=user_id,
        )
        return _normalize_base_interpretation(result)
    except Exception:
        logger.warning("Falling back to mock base interpretation")
        return _fallback_base_interpretation(
            dream_text, emotion_after_waking, dream_people, dream_symbols
        )


def generate_followup_question(
    dream_text: str,
    emotion_after_waking: str | None,
    dream_people: list[str] | None,
    dream_symbols: list[str] | None,
    user_id: int | None = None,
) -> str:
    """生成第一轮追问问题。"""

    try:
        result = qwen_client.chat_json(
            business_type="dream_followup_question",
            system_prompt=STYLE_RULES,
            user_prompt=(
                "请根据以下梦境信息输出一个最值得追问的问题，返回 JSON，字段为 question。\n"
                "要求：只能 1 个问题，25 字以内，聚焦情绪、现实压力、关系状态或内心冲突。\n"
                f"{_dream_context(dream_text, emotion_after_waking, dream_people, dream_symbols)}"
            ),
            user_id=user_id,
        )
        question = (result.get("question") or "").strip()
        if question:
            return question
    except Exception:
        logger.warning("Falling back to mock followup question")

    return _fallback_followup_question(
        dream_text, emotion_after_waking, dream_people, dream_symbols
    )


def generate_followup_interpretation(
    dream_text: str,
    emotion_after_waking: str | None,
    dream_people: list[str] | None,
    dream_symbols: list[str] | None,
    followup_question: str,
    user_answer: str,
    user_id: int | None = None,
) -> dict:
    """根据追问回答生成补充解析。"""

    try:
        result = qwen_client.chat_json(
            business_type="dream_followup",
            system_prompt=STYLE_RULES,
            user_prompt=(
                "请基于梦境信息和追问回答输出 JSON，字段为 closerState、deeperReason、suggestion。\n"
                f"{_dream_context(dream_text, emotion_after_waking, dream_people, dream_symbols)}\n"
                f"追问问题：{followup_question}\n"
                f"用户回答：{user_answer}"
            ),
            user_id=user_id,
        )
        return _normalize_followup_interpretation(result)
    except Exception:
        logger.warning("Falling back to mock followup interpretation")
        return _fallback_followup_interpretation(user_answer)


def generate_deep_interpretation(
    dream_text: str,
    emotion_after_waking: str | None,
    dream_people: list[str] | None,
    dream_symbols: list[str] | None,
    user_id: int | None = None,
) -> str:
    """生成会员可见的深度解梦文本。"""

    try:
        return qwen_client.chat_text(
            business_type="dream_deep",
            system_prompt=STYLE_RULES,
            user_prompt=(
                "请输出一份会员深度梦境解读，结构为："
                "【这次梦最核心的信号】【潜在情绪模式】【现实牵引】【你最近的内在课题】【给你的建议】【一句收束】。\n"
                f"{_dream_context(dream_text, emotion_after_waking, dream_people, dream_symbols)}"
            ),
            user_id=user_id,
        )
    except Exception:
        logger.warning("Falling back to mock deep interpretation")
        return _fallback_deep_interpretation(
            dream_text, emotion_after_waking, dream_people, dream_symbols
        )


def generate_fortune(
    fortune_date: date,
    recent_keywords: list[str] | None = None,
    recent_emotions: list[str] | None = None,
    is_pro: bool = False,
    user_id: int | None = None,
) -> dict:
    """生成今日运势内容。"""

    try:
        result = qwen_client.chat_json(
            business_type="fortune",
            system_prompt=STYLE_RULES,
            user_prompt=(
                "请生成今日运势 JSON，字段固定为 fortuneDate、overallStatus、reminderText、"
                "loveText、careerText、selfText、goodFor、avoidFor、luckyColor、luckyTime、fullContent、isProContent。\n"
                "不要写成命理预测，更像对今日状态、节奏和注意点的提醒。\n"
                f"日期：{fortune_date}\n"
                f"近期梦境关键词：{'、'.join(recent_keywords or ['未提供'])}\n"
                f"近期情绪标签：{'、'.join(recent_emotions or ['未提供'])}\n"
                f"当前是否会员：{'是' if is_pro else '否'}"
            ),
            user_id=user_id,
        )
        return {
            "fortuneDate": result.get("fortuneDate") or str(fortune_date),
            "overallStatus": _to_display_text(result.get("overallStatus")),
            "reminderText": _to_display_text(result.get("reminderText")),
            "loveText": _to_display_text(result.get("loveText")),
            "careerText": _to_display_text(result.get("careerText")),
            "selfText": _to_display_text(result.get("selfText")),
            "goodFor": _to_string_list(result.get("goodFor")),
            "avoidFor": _to_string_list(result.get("avoidFor")),
            "luckyColor": _to_display_text(result.get("luckyColor")),
            "luckyTime": _to_display_text(result.get("luckyTime")),
            "fullContent": _to_display_text(result.get("fullContent")),
            "isProContent": bool(result.get("isProContent", is_pro)),
        }
    except Exception:
        logger.warning("Falling back to mock fortune generation")
        return _fallback_fortune(fortune_date, recent_keywords, recent_emotions, is_pro)
