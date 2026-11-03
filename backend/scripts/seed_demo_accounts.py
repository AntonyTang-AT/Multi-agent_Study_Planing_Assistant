"""预置演示账号与个人场景数据。

用法（在 backend/ 下）::

    python -m scripts.seed_demo_accounts

每个学生账号带完整计划、作答、黑板与个人画像，便于切换身份展示真实学习痕迹。
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import delete, select  # noqa: E402

from app.db.models import AiCallLog, Attempt, BlackboardEntry, Plan, User  # noqa: E402
from app.db.session import SessionLocal, init_db  # noqa: E402
from app.services.security import hash_password  # noqa: E402

DEMO_PASSWORD = "demo"
ADMIN_PASSWORD = "admin"

ACCOUNTS = [
    {
        "id": "u_student_math",
        "username": "math",
        "display_name": "林清夏",
        "role": "student",
        "password": DEMO_PASSWORD,
    },
    {
        "id": "u_student_physics",
        "username": "phys",
        "display_name": "周予安",
        "role": "student",
        "password": DEMO_PASSWORD,
    },
    {
        "id": "u_student_catchup",
        "username": "catch",
        "display_name": "陈可",
        "role": "student",
        "password": DEMO_PASSWORD,
    },
    {
        "id": "u_admin",
        "username": "admin",
        "display_name": "教学管理",
        "role": "admin",
        "password": ADMIN_PASSWORD,
    },
]

MATH_OPTIONS = [
    {"id": "extend_time", "label": "每天多挤出 20 分钟"},
    {"id": "reduce_depth", "label": "证明改成例题精读，先保过线"},
    {"id": "adjust_goal", "label": "连续性章节挪到周末集中看"},
]


def _task(
    day: int,
    action: str,
    obj: str,
    minutes: int,
    criteria: str,
    load: str,
    knowledge_id: str,
    subject: str,
    error_tag: str | None = None,
    status: str = "todo",
) -> dict:
    item = {
        "day": day,
        "action": action,
        "object": obj,
        "minutes": minutes,
        "completion_criteria": criteria,
        "load": load,
        "knowledge_ids": [knowledge_id],
        "subject": subject,
        "status": status,
    }
    if error_tag:
        item["error_tag"] = error_tag
    return item


def _upsert_user(db, spec: dict) -> User:
    user = db.scalar(select(User).where(User.username == spec["username"]))
    if user is None:
        user = db.get(User, spec["id"])
    if user is None:
        user = User(id=spec["id"])
        db.add(user)
    user.id = spec["id"]
    user.username = spec["username"]
    user.display_name = spec["display_name"]
    user.role = spec["role"]
    user.password_hash = hash_password(spec["password"])
    user.demo_time_jump_days = 3 if spec["username"] == "catch" else 0
    return user


def _upsert_plan(db, user_id: str, plan: dict) -> None:
    row = db.scalar(select(Plan).where(Plan.user_id == user_id))
    payload = json.dumps(plan, ensure_ascii=False)
    if row is None:
        db.add(Plan(user_id=user_id, snapshot=payload))
    else:
        row.snapshot = payload


def _upsert_bb(db, entry_id: str, fields: dict) -> None:
    bb = db.get(BlackboardEntry, entry_id)
    if bb is None:
        db.add(BlackboardEntry(id=entry_id, **fields))
    else:
        for key, value in fields.items():
            setattr(bb, key, value)


def _replace_attempts(db, user_id: str, rows: list[dict]) -> None:
    db.execute(delete(Attempt).where(Attempt.user_id == user_id))
    for row in rows:
        db.add(Attempt(**row))


def _ensure_ai_log(
    db,
    *,
    user_id: str,
    intent: str,
    request_id: str,
    status: str,
    response: dict,
) -> None:
    exists = db.scalar(select(AiCallLog).where(AiCallLog.request_id == request_id))
    if exists is not None:
        return
    db.add(
        AiCallLog(
            user_id=user_id,
            intent=intent,
            request_id=request_id,
            status=status,
            request_body="{}",
            response_body=json.dumps(response, ensure_ascii=False),
        )
    )


def _seed_math_conflict(db, user_id: str) -> None:
    """林清夏：高数期末冲刺，今晚计划超时需调整。"""
    plan = {
        "scenario": "final_review",
        "goal": "11 月 22 日高数期末过线，先打通极限与连续",
        "daily_minutes_budget": 45,
        "days_left": 12,
        "tasks": [
            _task(
                1,
                "回看",
                "极限定义与邻域语言",
                20,
                "用自己的话讲清 ε-δ，并写出 2 个反例",
                "low",
                "math.a1.ch02",
                "math",
                status="done",
            ),
            _task(
                2,
                "练习",
                "第一重要极限与夹逼",
                40,
                "完成 4 道基础题，每题标出放缩方向",
                "medium",
                "math.a1.ch02",
                "math",
                error_tag="formula_misuse",
                status="done",
            ),
            _task(
                3,
                "整理",
                "函数连续性证明（综合）",
                60,
                "整理证明卡片并标注每一步依据",
                "high",
                "math.a1.ch04",
                "math",
                status="blocked",
            ),
            _task(
                4,
                "练习",
                "无穷小比较常见型",
                35,
                "完成 3 道填空，错题写回错因本",
                "medium",
                "math.a1.ch02",
                "math",
            ),
            _task(
                5,
                "回看",
                "连续与间断分类小结",
                25,
                "画一张分类表，覆盖可去、跳跃、无穷间断",
                "low",
                "math.a1.ch04",
                "math",
            ),
            _task(
                6,
                "模拟",
                "极限综合小测 20 分钟",
                30,
                "限时完成 5 题，正确率目标 ≥ 70%",
                "high",
                "math.a1.ch02",
                "math",
            ),
            _task(
                7,
                "复盘",
                "错题本极限专题",
                30,
                "把本周错题按公式误用 / 放缩方向归类",
                "medium",
                "math.a1.ch02",
                "math",
            ),
        ],
        "_demo": {
            "plan_status": "conflict",
            "plan_message": "今晚只剩 45 分钟，但「连续性证明」需要约 60 分钟，需要先决定怎么改今晚安排。",
            "user_options": MATH_OPTIONS,
            "selected_option_id": "reduce_depth",
            "show_intervention": False,
            "setup": {
                "mode": "final_review",
                "subject": "math",
                "dailyMinutes": 45,
                "examDate": "2026-11-22",
                "chapter": "高等数学 A1 · 第 2–4 章",
            },
            "persona": {
                "real_name": "林清夏",
                "major": "计算机类 · 2024 级",
                "course": "高等数学 A1",
                "semester": "大一上 · 距期末 12 天",
                "focus": "极限计算已基本稳住，连续性证明还卡住",
                "weak_points": [
                    "放缩方向容易写反",
                    "见到复杂分式就想直接上洛必达",
                    "证明题缺少「先写定义再拆步骤」的习惯",
                ],
                "next_action": "先处理今晚超时的安排，再继续极限综合小测",
                "next_path": "/plan",
                "chat_greeting": "清夏你好。距离高数期末还有 12 天，今晚的连续性证明看起来会超出你设定的 45 分钟。要不要先一起看看怎么改今晚的安排？",
                "quick_asks": [
                    "今晚时间不够怎么办",
                    "我夹逼定理哪里容易错",
                    "帮我安排明日复习",
                    "最近正确率怎么样",
                ],
                "recent_days": [
                    {"when": "前天 20:10", "text": "极限定义笔记完成，自测 2/2"},
                    {"when": "昨天 21:05", "text": "夹逼基础题 4 道，错 1 道（放缩方向）"},
                    {"when": "今天 15:40", "text": "做到连续性证明第 2 步后暂停，标记「稍后再看」"},
                ],
                "mastery": [
                    {"label": "极限定义", "value": 82},
                    {"label": "夹逼定理", "value": 58},
                    {"label": "重要极限", "value": 74},
                    {"label": "连续性证明", "value": 41},
                ],
                "question_notes": [
                    {
                        "question_id": "math_a1c01_0001",
                        "title": "求 lim(x→0) (sin 3x − 3x)/x³",
                    },
                    {
                        "question_id": "math_a1c01_0002",
                        "title": "用夹逼证明 lim(x→0) x² sin(1/x) = 0",
                    },
                    {
                        "question_id": "math_a1c02_0001",
                        "title": "讨论 f(x)=|x|/x 在 x=0 的连续性",
                    },
                    {
                        "question_id": "math_a1c02_0002",
                        "title": "无穷小比较：sin x 与 x − x³/6",
                    },
                    {
                        "question_id": "math_a1c03_0001",
                        "title": "分段函数连续条件填空",
                    },
                ],
                "materials_focus": "教材第 2 章极限 + 课件例题 3、5",
            },
        },
    }
    _upsert_plan(db, user_id, plan)
    _upsert_bb(
        db,
        "bb_seed_math_conflict",
        {
            "user_id": user_id,
            "type": "conflict",
            "summary": "今晚「连续性证明」约需 60 分钟，超过你设定的每日 45 分钟",
            "severity": "high",
            "evidence_refs": json.dumps(
                ["学习计划 · 第 3 天", "每日可用时间 ≤ 45 分钟", "昨晚练习已用 40 分钟"],
                ensure_ascii=False,
            ),
            "status": "open",
            "resolution": None,
        },
    )
    _upsert_bb(
        db,
        "bb_seed_math_note",
        {
            "user_id": user_id,
            "type": "stage_conclusion",
            "summary": "极限计算部分可暂视为过线水平，下一周重点应放在证明书写",
            "severity": "low",
            "evidence_refs": json.dumps(
                ["近 5 次极限题正确率 80%", "证明题仍有 2 次中途放弃"],
                ensure_ascii=False,
            ),
            "status": "resolved",
            "resolution": json.dumps(
                {"action": "keep_focus", "note": "已将证明题排到第 3、5 天"},
                ensure_ascii=False,
            ),
        },
    )
    now = datetime.now(timezone.utc)
    _replace_attempts(
        db,
        user_id,
        [
            {
                "id": "att_math_001",
                "user_id": user_id,
                "question_id": "math_a1c01_0001",
                "answer": "直接洛必达三次，结果写成 -3/2",
                "is_correct": False,
                "error_tag": "公式误用",
                "duration_ms": 42000,
                "created_at": now - timedelta(days=2, hours=3),
            },
            {
                "id": "att_math_002",
                "user_id": user_id,
                "question_id": "math_a1c01_0002",
                "answer": "-x² ≤ x²sin(1/x) ≤ x²，夹逼得 0",
                "is_correct": True,
                "error_tag": None,
                "duration_ms": 28000,
                "created_at": now - timedelta(days=1, hours=5),
            },
            {
                "id": "att_math_003",
                "user_id": user_id,
                "question_id": "math_a1c02_0001",
                "answer": "左右极限不等，先不确定怎么写结论",
                "is_correct": None,
                "error_tag": "假设不清",
                "duration_ms": 15000,
                "created_at": now - timedelta(hours=6),
            },
            {
                "id": "att_math_004",
                "user_id": user_id,
                "question_id": "math_a1c02_0002",
                "answer": "等价替换 sin x ~ x",
                "is_correct": True,
                "error_tag": None,
                "duration_ms": 19000,
                "created_at": now - timedelta(days=1, hours=2),
            },
            {
                "id": "att_math_005",
                "user_id": user_id,
                "question_id": "math_a1c03_0001",
                "answer": "漏写 x→0+ 一侧条件",
                "is_correct": False,
                "error_tag": "边界条件",
                "duration_ms": 31000,
                "created_at": now - timedelta(hours=20),
            },
        ],
    )
    _ensure_ai_log(
        db,
        user_id=user_id,
        intent="create_plan",
        request_id="seed_math_cp",
        status="conflict",
        response={"status": "conflict", "message": "tonight overflow"},
    )


def _seed_physics_ok(db, user_id: str) -> None:
    """周予安：大物力学跟课，受力图漏了摩擦。"""
    plan = {
        "scenario": "catch_up",
        "goal": "两周内跟上力学进度，受力分析不再丢条件",
        "daily_minutes_budget": 60,
        "days_left": 14,
        "tasks": [
            _task(
                1,
                "回看",
                "质点运动：位移、速度、加速度",
                25,
                "完成 1 页对照表，区分平均量与瞬时量",
                "low",
                "physics.mech.ch01",
                "physics",
                status="done",
            ),
            _task(
                2,
                "练习",
                "牛顿定律 · 三力平衡",
                45,
                "独立画 3 个受力图并写出方程",
                "medium",
                "physics.mech.ch02",
                "physics",
                error_tag="遗漏假设",
                status="done",
            ),
            _task(
                3,
                "练习",
                "斜面 + 摩擦力综合",
                50,
                "完成 2 道综合题，每题先列「是否计摩擦」",
                "high",
                "physics.mech.ch02",
                "physics",
                status="in_progress",
            ),
            _task(
                4,
                "回看",
                "课堂例题：木块相对传送带",
                30,
                "对照课件例 4，补齐相对运动分析",
                "medium",
                "physics.mech.ch02",
                "physics",
            ),
            _task(
                5,
                "整理",
                "受力分析检查清单",
                25,
                "整理「重力 / 弹力 / 摩擦 / 拉力」四步检查表",
                "low",
                "physics.mech.ch02",
                "physics",
            ),
            _task(
                6,
                "练习",
                "圆周运动入门衔接",
                40,
                "完成向心力基础题 3 道",
                "medium",
                "physics.mech.ch03",
                "physics",
            ),
        ],
        "_demo": {
            "plan_status": "ok",
            "plan_message": "本周力学计划已排好。上一道斜面题漏写摩擦力，建议先补检查清单再继续综合题。",
            "user_options": [],
            "selected_option_id": "",
            "show_intervention": False,
            "setup": {
                "mode": "catch_up",
                "subject": "physics",
                "dailyMinutes": 60,
                "examDate": "2026-12-18",
                "chapter": "大学物理 · 力学第 2 章",
            },
            "persona": {
                "real_name": "周予安",
                "major": "机械类 · 2024 级",
                "course": "大学物理 B",
                "semester": "大一上 · 力学进度落后约 1 周",
                "focus": "牛顿定律跟课补漏，受力图完整性",
                "weak_points": [
                    "斜面问题常默认光滑",
                    "静摩擦与滑动摩擦切换不敏感",
                    "相对地面 / 相对传送带参考系混用",
                ],
                "next_action": "处理「遗漏摩擦力」这条提醒，然后继续斜面综合题",
                "next_path": "/blackboard",
                "chat_greeting": "予安，力学第 2 章你已经补回三力平衡。昨天那道斜面题漏了摩擦力，要不要先把检查清单过一遍再继续？",
                "quick_asks": [
                    "这道斜面为什么错了",
                    "今天该练哪一类题",
                    "摩擦力和法向怎么判断",
                    "我跟课程进度差多少",
                ],
                "recent_days": [
                    {"when": "大前天", "text": "运动学概念回看完成"},
                    {"when": "前天 19:30", "text": "三力平衡 3 题全对"},
                    {"when": "昨天 20:15", "text": "斜面综合第 1 题漏写摩擦，已标错"},
                    {"when": "今天 10:00", "text": "打开综合题第 2 题后暂缓提交"},
                ],
                "mastery": [
                    {"label": "运动学", "value": 78},
                    {"label": "牛顿定律", "value": 66},
                    {"label": "摩擦力", "value": 44},
                    {"label": "相对运动", "value": 52},
                ],
                "question_notes": [
                    {
                        "question_id": "physics_mech_0001",
                        "title": "匀加速直线运动位移公式选择",
                    },
                    {
                        "question_id": "physics_mech_0002",
                        "title": "悬挂重物三力平衡作图",
                    },
                    {
                        "question_id": "physics_mech_0003",
                        "title": "粗糙斜面上滑块的加速度",
                    },
                    {
                        "question_id": "physics_mech_0004",
                        "title": "传送带上木块相对滑动判定",
                    },
                    {
                        "question_id": "physics_mech_0005",
                        "title": "静摩擦达到最大值的临界角",
                    },
                ],
                "materials_focus": "大物课件第 2 章 + 作业 2.3、2.5",
            },
        },
    }
    _upsert_plan(db, user_id, plan)
    _upsert_bb(
        db,
        "bb_seed_physics_challenge",
        {
            "user_id": user_id,
            "type": "challenge",
            "summary": "斜面题草稿默认「光滑」，但题干写了摩擦系数 μ=0.2",
            "severity": "medium",
            "evidence_refs": json.dumps(
                ["作答 · 粗糙斜面上滑块的加速度", "题干条件 · μ=0.2", "你的草稿未出现 f=μN"],
                ensure_ascii=False,
            ),
            "status": "open",
            "resolution": None,
        },
    )
    _upsert_bb(
        db,
        "bb_seed_physics_oknote",
        {
            "user_id": user_id,
            "type": "hypothesis",
            "summary": "若先强制写出「接触面是否光滑」再列方程，漏力概率会下降",
            "severity": "low",
            "evidence_refs": json.dumps(
                ["近 2 次错题均与摩擦假设有关"],
                ensure_ascii=False,
            ),
            "status": "open",
            "resolution": None,
        },
    )
    now = datetime.now(timezone.utc)
    _replace_attempts(
        db,
        user_id,
        [
            {
                "id": "att_phy_001",
                "user_id": user_id,
                "question_id": "physics_mech_0001",
                "answer": "x = v0t + ½at²",
                "is_correct": True,
                "error_tag": None,
                "duration_ms": 18000,
                "created_at": now - timedelta(days=3),
            },
            {
                "id": "att_phy_002",
                "user_id": user_id,
                "question_id": "physics_mech_0002",
                "answer": "T1、T2、mg 闭合三角形",
                "is_correct": True,
                "error_tag": None,
                "duration_ms": 22000,
                "created_at": now - timedelta(days=2),
            },
            {
                "id": "att_phy_003",
                "user_id": user_id,
                "question_id": "physics_mech_0003",
                "answer": "按光滑斜面算出 a=g sinθ",
                "is_correct": False,
                "error_tag": "遗漏假设",
                "duration_ms": 35000,
                "created_at": now - timedelta(days=1),
            },
            {
                "id": "att_phy_004",
                "user_id": user_id,
                "question_id": "physics_mech_0004",
                "answer": "相对静止条件还没写完",
                "is_correct": None,
                "error_tag": "假设不清",
                "duration_ms": 12000,
                "created_at": now - timedelta(hours=4),
            },
            {
                "id": "att_phy_005",
                "user_id": user_id,
                "question_id": "physics_mech_0005",
                "answer": "tanθ = μs",
                "is_correct": True,
                "error_tag": None,
                "duration_ms": 26000,
                "created_at": now - timedelta(days=2, hours=6),
            },
            {
                "id": "att_phy_006",
                "user_id": user_id,
                "question_id": "physics_mech_0003",
                "answer": "补写 f=μN 后重算，方向仍反了",
                "is_correct": False,
                "error_tag": "方向判断",
                "duration_ms": 41000,
                "created_at": now - timedelta(hours=22),
            },
        ],
    )
    _ensure_ai_log(
        db,
        user_id=user_id,
        intent="verify_answer",
        request_id="seed_phy_vf",
        status="ok",
        response={"status": "ok", "verdict": "doubt"},
    )


def _seed_catchup_intervention(db, user_id: str) -> None:
    """陈可：连续两天没练，需要低门槛恢复。"""
    plan = {
        "scenario": "catch_up",
        "goal": "先恢复每日学习节奏，再逐步回到极限专题",
        "daily_minutes_budget": 40,
        "days_left": 9,
        "tasks": [
            _task(
                1,
                "热身",
                "错题卡片速览（10 分钟）",
                15,
                "只重读 3 张卡片，写出今天愿意做的一件小事",
                "low",
                "math.a1.ch02",
                "math",
                status="todo",
            ),
            _task(
                2,
                "练习",
                "极限基础填空 ×2",
                20,
                "完成即可结束，不追求综合题",
                "low",
                "math.a1.ch02",
                "math",
            ),
            _task(
                3,
                "回看",
                "上周中断的夹逼例题",
                25,
                "把例题步骤抄完，标出自己卡住的那一行",
                "medium",
                "math.a1.ch02",
                "math",
            ),
            _task(
                4,
                "练习",
                "恢复后的小测",
                30,
                "限时 15 分钟做 3 道基础题",
                "medium",
                "math.a1.ch02",
                "math",
            ),
        ],
        "_demo": {
            "plan_status": "ok",
            "plan_message": "检测到你已连续两天没有打开练习。今天的安排已经缩短，先完成 15 分钟热身即可。",
            "user_options": [],
            "selected_option_id": "",
            "show_intervention": True,
            "setup": {
                "mode": "catch_up",
                "subject": "math",
                "dailyMinutes": 40,
                "examDate": "2026-11-30",
                "chapter": "高等数学 · 极限补漏",
            },
            "persona": {
                "real_name": "陈可",
                "major": "电子信息 · 2023 级",
                "course": "高等数学（重修跟课）",
                "semester": "本学期跟课补漏 · 近 2 天未练习",
                "focus": "先恢复节奏，再谈进度追赶",
                "weak_points": [
                    "连续学习超过 25 分钟就容易放弃",
                    "一看到证明题就跳过",
                    "中断后不知道从哪一页捡起来",
                ],
                "next_action": "先看恢复建议，然后只做 15 分钟热身",
                "next_path": "/blackboard",
                "chat_greeting": "陈可，这两天没有练习记录。我把今天的任务收成了 15+20 分钟两段，你随时可以从热身那一段开始，不必一次补完全部。",
                "quick_asks": [
                    "我两天没学了怎么办",
                    "今天最少要完成什么",
                    "为什么计划变短了",
                    "帮我从中断的地方继续",
                ],
                "recent_days": [
                    {"when": "4 天前", "text": "打开极限题后 5 分钟退出"},
                    {"when": "3 天前", "text": "夹逼例题做到一半，标记「下次再说」"},
                    {"when": "昨天 / 前天", "text": "无练习记录"},
                    {"when": "今天", "text": "登录后尚未开始今日热身"},
                ],
                "mastery": [
                    {"label": "极限计算", "value": 46},
                    {"label": "夹逼定理", "value": 33},
                    {"label": "学习坚持度", "value": 28},
                    {"label": "错题复盘", "value": 37},
                ],
                "question_notes": [
                    {
                        "question_id": "math_a1c01_0001",
                        "title": "第一重要极限填空（基础）",
                    },
                    {
                        "question_id": "math_a1c01_0002",
                        "title": "夹逼定理选择放缩方向",
                    },
                    {
                        "question_id": "math_catch_0001",
                        "title": "10 分钟热身：判断极限是否存在",
                    },
                ],
                "materials_focus": "错题卡片 3 张 + 教材例 2.1",
            },
        },
    }
    _upsert_plan(db, user_id, plan)
    _upsert_bb(
        db,
        "bb_seed_catchup_intervention",
        {
            "user_id": user_id,
            "type": "intervention",
            "summary": "已连续 2 天没有练习，建议先完成 15 分钟热身再决定是否加练",
            "severity": "medium",
            "evidence_refs": json.dumps(
                ["最近练习间隔 48 小时+", "上次停留在夹逼例题第 2 步", "今日计划已缩短为两段"],
                ensure_ascii=False,
            ),
            "status": "open",
            "resolution": None,
        },
    )
    now = datetime.now(timezone.utc)
    _replace_attempts(
        db,
        user_id,
        [
            {
                "id": "att_catch_001",
                "user_id": user_id,
                "question_id": "math_a1c01_0001",
                "answer": "打开后未提交",
                "is_correct": None,
                "error_tag": "中途离开",
                "duration_ms": 5000,
                "created_at": now - timedelta(days=4),
            },
            {
                "id": "att_catch_002",
                "user_id": user_id,
                "question_id": "math_a1c01_0002",
                "answer": "放缩写到一半",
                "is_correct": False,
                "error_tag": "公式误用",
                "duration_ms": 20000,
                "created_at": now - timedelta(days=3, hours=8),
            },
            {
                "id": "att_catch_003",
                "user_id": user_id,
                "question_id": "math_catch_0001",
                "answer": "判断存在，但说不清理由",
                "is_correct": False,
                "error_tag": "概念不清",
                "duration_ms": 9000,
                "created_at": now - timedelta(days=5),
            },
        ],
    )
    _ensure_ai_log(
        db,
        user_id=user_id,
        intent="proactive_intervention",
        request_id="seed_catchup_pi",
        status="need_user",
        response={"status": "need_user", "message": "resume short"},
    )


def _seed_admin_distribution(db) -> None:
    """管理员看板用的匿名汇总痕迹，不污染三名学生的个人轨迹。"""
    synth = db.get(User, "u_stats_pad")
    if synth is None:
        synth = User(
            id="u_stats_pad",
            username="stats_pad",
            display_name="统计填充",
            role="student",
            password_hash=hash_password("unused-stats"),
            demo_time_jump_days=0,
        )
        db.add(synth)
        db.flush()
    now = datetime.now(timezone.utc)
    for day in range(7):
        for j in range(2):
            aid = f"att_stats_{day}_{j}"
            if db.get(Attempt, aid) is not None:
                continue
            db.add(
                Attempt(
                    id=aid,
                    user_id="u_stats_pad",
                    question_id=f"stats_q_{day}_{j}",
                    answer="pad",
                    is_correct=bool((day + j) % 3),
                    duration_ms=900,
                    created_at=now - timedelta(days=day, hours=j + 1),
                )
            )


def seed_demo_accounts() -> dict:
    init_db()
    with SessionLocal() as db:
        for spec in ACCOUNTS:
            _upsert_user(db, spec)
        db.flush()
        _seed_math_conflict(db, "u_student_math")
        _seed_physics_ok(db, "u_student_physics")
        _seed_catchup_intervention(db, "u_student_catchup")
        _seed_admin_distribution(db)
        db.commit()
    return {"accounts": [a["username"] for a in ACCOUNTS]}


def main() -> int:
    stats = seed_demo_accounts()
    print("seeded demo accounts:", stats)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
