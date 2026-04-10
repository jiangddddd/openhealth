from __future__ import annotations

from collections import Counter
from datetime import date


MOOD_COPY = {
    "开心": {
        "overall": "今天整体状态偏明亮，情绪里有比较稳定的轻松感。",
        "attention": "别急着把这份轻松当成理所当然，它正说明你最近有些部分正在慢慢回到顺畅。",
        "reminder": "今天适合把这份好状态留给真正重要的人和事。",
        "diet_direction": "今天更适合保持规律、清爽、不过度负担的饮食节奏。",
        "eat_more": ["正常主食", "清淡熟食", "足够水分"],
        "eat_less": ["情绪化暴食", "太甜太腻", "过量冰饮"],
        "diet_tip": "状态不错的时候，也别忽略规律吃饭这件小事。",
    },
    "平静": {
        "overall": "今天整体状态偏平稳，情绪起伏不大，更像是在慢慢整理自己。",
        "attention": "平静不代表没有感受，你真正需要留意的是那些还没说出口的小牵挂。",
        "reminder": "今天适合做一件简单但确定的事，继续稳住自己的节奏。",
        "diet_direction": "今天更适合温和、规律、不过度刺激的饮食方式。",
        "eat_more": ["热食", "蔬菜", "正常主食"],
        "eat_less": ["高刺激饮料", "太随便的一顿", "长时间空腹"],
        "diet_tip": "规律吃饭会让这种平稳感更容易延续到晚上。",
    },
    "焦虑": {
        "overall": "今天整体情绪偏紧绷，更多像是心里有事一直没真正放下。",
        "attention": "你现在最需要留意的不是效率，而是自己是不是已经持续绷得太久。",
        "reminder": "今天先把最重要的一件事收口，比逼自己面面俱到更重要。",
        "diet_direction": "今天更适合温和、规律、少刺激的饮食节奏。",
        "eat_more": ["温热食物", "清淡主食", "补充水分"],
        "eat_less": ["过量咖啡", "辛辣刺激食物", "长时间空腹"],
        "diet_tip": "如果今天情绪有点紧绷，晚一点吃饭也比不吃更好。",
    },
    "疲惫": {
        "overall": "今天整体情绪偏疲惫，更像是持续消耗后的无力感，而不是单纯懒散。",
        "attention": "你需要留意的不是自己够不够努力，而是身体和情绪是不是都已经在提醒你该缓一缓。",
        "reminder": "今晚尽量别再逼自己处理太多事，先把恢复体力放到前面。",
        "diet_direction": "今天更适合吃得规律一点，重点是补充体力而不是随便对付。",
        "eat_more": ["热的熟食", "蛋白质摄入", "正常主食"],
        "eat_less": ["只靠零食顶着", "太油太甜", "太晚进食"],
        "diet_tip": "今天如果已经很累了，重点不是吃得完美，而是不要继续消耗自己。",
    },
    "难过": {
        "overall": "今天整体情绪偏低落，内心可能还有一部分感受没有被真正安放下来。",
        "attention": "现在更值得留意的是，你有没有允许自己先承认这份难过，而不是急着跳过去。",
        "reminder": "今天不一定要马上振作，先把情绪接住，本身就是一种照顾自己。",
        "diet_direction": "今天更适合温热、熟软、负担小一点的饮食。",
        "eat_more": ["热汤热粥", "清淡熟食", "规律正餐"],
        "eat_less": ["冰冷食物", "高糖冲动进食", "不吃正餐"],
        "diet_tip": "情绪低的时候，先让身体得到基本照顾，心也会慢慢稳定一点。",
    },
    "烦躁": {
        "overall": "今天整体情绪偏烦躁，很多感受像是堆在一起，没有完全找到出口。",
        "attention": "你现在需要留意的不是情绪对不对，而是别再继续给自己加新的刺激。",
        "reminder": "先减少一点外界噪音和内部拉扯，你会更容易找回控制感。",
        "diet_direction": "今天更适合简单、清淡、负担小一点的饮食。",
        "eat_more": ["清淡熟食", "易消化食物", "水果和温水"],
        "eat_less": ["刺激性饮料", "重口味食物", "边熬夜边乱吃"],
        "diet_tip": "你现在更需要的是让身体安静下来，而不是继续给自己加刺激。",
    },
    "迷茫": {
        "overall": "今天整体状态偏迷茫，像是心里有想法，但暂时还没理出最确定的方向。",
        "attention": "真正值得留意的不是你是不是马上有答案，而是别让自己一直停在原地消耗。",
        "reminder": "明天可以先推进一件最小的事，先找回一点确定感。",
        "diet_direction": "今天更适合规律、稳定、少起伏的饮食方式。",
        "eat_more": ["正常正餐", "热食", "适量蛋白质"],
        "eat_less": ["想到什么吃什么", "用咖啡代替吃饭", "太晚吃夜宵"],
        "diet_tip": "身体有节奏，脑子也会更容易慢慢理顺。",
    },
}


def _pick_main_tags(mood_tags: list[str], dream_tags: list[str]) -> str:
    tags = [tag for tag in mood_tags + dream_tags if tag]
    if not tags:
        return "今天的情绪更多像是被一些持续消耗的小事慢慢牵动。"

    top_tags = [item for item, _ in Counter(tags).most_common(2)]
    if len(top_tags) == 1:
        return f"今天比较容易被“{top_tags[0]}”相关的事情牵动。"
    return f"今天更容易被“{top_tags[0]}”和“{top_tags[1]}”相关的事情来回影响。"


def build_daily_summary(
    *,
    summary_date: date,
    moods: list[dict],
    dreams: list[dict],
) -> dict:
    """根据当天心情和梦境快照，生成一份轻量的每日总结。"""

    latest_mood = moods[-1] if moods else {}
    mood_type = latest_mood.get("moodType") or "平静"
    mood_copy = MOOD_COPY.get(mood_type, MOOD_COPY["平静"])
    dream_summaries = [item.get("summary") for item in dreams if item.get("summary")]
    dream_tags = [tag for item in dreams for tag in item.get("tags", [])]
    mood_tags = [tag for item in moods for tag in item.get("moodTags", [])]

    overall_status = mood_copy["overall"]
    if dream_summaries:
        overall_status += f" 同时，今天记录到的梦也在提示：{dream_summaries[0]}"

    main_factors = _pick_main_tags(mood_tags, dream_tags)
    if latest_mood.get("moodReason"):
        main_factors += f" 你提到“{latest_mood['moodReason']}”，这也是今天的重要线索。"

    return {
        "summaryDate": summary_date,
        "overallStatus": overall_status,
        "mainFactors": main_factors,
        "attentionPoint": mood_copy["attention"],
        "reminder": mood_copy["reminder"],
        "dietAdvice": {
            "direction": mood_copy["diet_direction"],
            "eatMore": mood_copy["eat_more"],
            "eatLess": mood_copy["eat_less"],
            "tip": mood_copy["diet_tip"],
        },
        "sourceSnapshot": {
            "moods": moods,
            "dreams": dreams,
        },
    }
