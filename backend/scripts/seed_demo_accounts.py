"""预置演示账号与班级统计数据。

用法（在 backend/ 下）::

    python -m scripts.seed_demo_accounts

- 4 名重点学生（math / phys / catch / cs）：完整计划、作答、黑板与对话画像
- 47 名班级同学（s01–s47）：计划 / 作答 / 少量提醒，供管理端统计
- 合计 51 名学生；班级同学不编造对话内容
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
        "id": "u_student_cs",
        "username": "cs",
        "display_name": "江予澈",
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

CS_OPTIONS = [
    {"id": "extend_time", "label": "每天多挤出一点时间"},
    {"id": "reduce_depth", "label": "先降低今晚任务难度"},
    {"id": "adjust_goal", "label": "把难点挪到周末"},
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


def _reset_user_learning_state(db, user_id: str) -> None:
    """清掉该账号演示过程中产生的脏黑板 / 额外作答，再由 seed 写回基线。"""
    db.execute(delete(BlackboardEntry).where(BlackboardEntry.user_id == user_id))
    db.execute(delete(Attempt).where(Attempt.user_id == user_id))
    db.execute(delete(AiCallLog).where(AiCallLog.user_id == user_id))


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
    _reset_user_learning_state(db, user_id)
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
                [
                    "传话 · 程计：第 3 天「连续性证明」估时 60 分钟，已经顶破每日 45 分钟预算。",
                    "传话 · 安节：别直接砍整晚任务，给三个选项——压缩证明 / 顺延一天 / 临时加时。",
                    "传话 · 析因：记下这次拍板，下周排期避开同类塞车。",
                    "依据 · 第 3 天「连续性证明」约 60 分钟",
                    "约束 · 每日可用时间 ≤ 45 分钟",
                    "建议动作 · 打开学习计划，选择压缩证明或顺延",
                ],
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
                [
                    "传话 · 析因：近 5 次极限题正确率约 80%，可视为过线。",
                    "传话 · 程计：那下周排期把力气挪到证明书写。",
                    "依据 · 近 5 次极限题正确率约 80%",
                    "依据 · 证明题仍有 2 次中途放弃",
                    "建议动作 · 去学习轨迹确认强弱项",
                ],
                ensure_ascii=False,
            ),
            "status": "resolved",
            "resolution": json.dumps(
                {"action": "keep_focus", "note": "已将证明题排到第 3、5 天"},
                ensure_ascii=False,
            ),
        },
    )
    # 历史协作：已处理的多轮传话，展示「不是只有当前待办」
    _upsert_bb(
        db,
        "bb_seed_math_hist_plan",
        {
            "user_id": user_id,
            "type": "hypothesis",
            "summary": "（历史）上周：先把夹逼题正确率拉到 70%，再碰连续性证明",
            "severity": "low",
            "evidence_refs": json.dumps(
                [
                    "传话 · 析因：夹逼近 3 次正确率只有 45%，证明再堆只会更慌。",
                    "传话 · 程计：那本周任务改成「夹逼热身 ×3 + 证明草稿 ×1」。",
                    "传话 · 温题：我准备两道夹逼变式，做完打卡即可。",
                    "传话 · 安节：每天上限仍 45 分钟，证明草稿只留 15 分钟。",
                    "依据 · 上周夹逼正确率 45%",
                    "建议动作 · 已确认并写入计划",
                ],
                ensure_ascii=False,
            ),
            "status": "resolved",
            "resolution": json.dumps(
                {"action": "ack", "note": "已按假设调整上周计划"},
                ensure_ascii=False,
            ),
        },
    )
    _upsert_bb(
        db,
        "bb_seed_math_hist_verify",
        {
            "user_id": user_id,
            "type": "challenge",
            "summary": "（历史）洛必达连用三次被校验拦下：未核对条件",
            "severity": "medium",
            "evidence_refs": json.dumps(
                [
                    "传话 · 温题：草稿直接洛必达三次，条件写糊了，先别提交。",
                    "传话 · 析因：这是「公式误用」标签第二次出现。",
                    "传话 · 程计：把「洛必达条件检查」加进明日热身清单。",
                    "传话 · 安节：今天只订正这一题就收工，别再开新证明。",
                    "依据 · verify#failed · 洛必达条件缺失",
                    "建议动作 · 已订正并标记了解",
                ],
                ensure_ascii=False,
            ),
            "status": "resolved",
            "resolution": json.dumps(
                {"action": "ack", "note": "已补条件后重交"},
                ensure_ascii=False,
            ),
        },
    )
    _upsert_bb(
        db,
        "bb_seed_math_hist_pace",
        {
            "user_id": user_id,
            "type": "intervention",
            "summary": "（历史）期中后曾连续 3 天未练，助手们缩短了任务颗粒",
            "severity": "medium",
            "evidence_refs": json.dumps(
                [
                    "传话 · 安节：检测到 72 小时空白，先别用原计划硬扛。",
                    "传话 · 程计：今日只保留 15 分钟极限填空。",
                    "传话 · 温题：热身题已就绪，完成即可恢复节奏。",
                    "传话 · 析因：空白后第一天正确率通常偏低，不记入强弱项。",
                    "依据 · demo#time_jump",
                    "建议动作 · 已完成短热身",
                ],
                ensure_ascii=False,
            ),
            "status": "resolved",
            "resolution": json.dumps(
                {"action": "ack", "note": "已用短任务重启"},
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
    _reset_user_learning_state(db, user_id)
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
                [
                    "传话 · 温题：题干写了 μ=0.2，草稿却按光滑面算，先拦住提交。",
                    "传话 · 析因：近两次错题都和摩擦假设有关，值得钉在黑板上。",
                    "传话 · 安节：提醒语气放软——指出缺摩擦力，再送回练习页。",
                    "依据 · 题干写明 μ=0.2",
                    "依据 · 草稿按光滑面计算",
                    "建议动作 · 回练习页补全摩擦力后再提交",
                ],
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
                [
                    "传话 · 析因：提出可验证假设——先写「光滑？/有摩擦？」再列式。",
                    "传话 · 温题：下次同类题我会按这条先检查再提示。",
                    "依据 · 近 2 次错题都与摩擦假设有关",
                    "建议动作 · 下次先在草稿纸写「光滑？/有摩擦？」再列式",
                ],
                ensure_ascii=False,
            ),
            "status": "open",
            "resolution": None,
        },
    )
    _upsert_bb(
        db,
        "bb_seed_physics_hist_force",
        {
            "user_id": user_id,
            "type": "challenge",
            "summary": "（历史）受力分析漏画支持力，助手拦下并补受力清单",
            "severity": "medium",
            "evidence_refs": json.dumps(
                [
                    "传话 · 温题：草稿只有重力与拉力，缺支持力，先别交。",
                    "传话 · 析因：受力漏项是上周错因第一名。",
                    "传话 · 程计：明日热身改成「先列力再写方程」模板题。",
                    "传话 · 安节：订正这题就够，别连做三道难题。",
                    "依据 · 受力分析缺支持力",
                    "建议动作 · 已补全后提交",
                ],
                ensure_ascii=False,
            ),
            "status": "resolved",
            "resolution": json.dumps(
                {"action": "ack", "note": "已按清单订正"},
                ensure_ascii=False,
            ),
        },
    )
    _upsert_bb(
        db,
        "bb_seed_physics_hist_plan",
        {
            "user_id": user_id,
            "type": "conflict",
            "summary": "（历史）曾把动能定理与摩擦长题排进同一晚，超时后改期",
            "severity": "high",
            "evidence_refs": json.dumps(
                [
                    "传话 · 程计：今晚两道长题合计 70 分钟，超过每日 50 分钟。",
                    "传话 · 安节：建议保留动能定理，摩擦题顺延。",
                    "传话 · 温题：那我把摩擦题移到练习中心「明日待做」。",
                    "传话 · 析因：连续超时会降低完成率，记一笔。",
                    "依据 · plan#overload",
                    "建议动作 · 已选择顺延",
                ],
                ensure_ascii=False,
            ),
            "status": "resolved",
            "resolution": json.dumps(
                {"action": "defer", "note": "摩擦题顺延一天"},
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
    _reset_user_learning_state(db, user_id)
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
                [
                    "传话 · 安节：已经超过 48 小时没有练习信号，需要短任务把节奏拉回来。",
                    "传话 · 程计：今日目标收成 15 分钟热身，完成即可打卡。",
                    "传话 · 温题：热身题准备好了，点开始就能做。",
                    "依据 · 最近练习间隔超过 48 小时",
                    "依据 · 上次停在夹逼例题第 2 步",
                    "建议动作 · 先做 15 分钟热身，完成即可打卡",
                ],
                ensure_ascii=False,
            ),
            "status": "open",
            "resolution": None,
        },
    )
    _upsert_bb(
        db,
        "bb_seed_catchup_hist_restart",
        {
            "user_id": user_id,
            "type": "stage_conclusion",
            "summary": "（历史）上一次断档后：用 3 天短热身把登录节奏拉回来了",
            "severity": "low",
            "evidence_refs": json.dumps(
                [
                    "传话 · 安节：连续缺勤后不要用原计划硬顶，先保证「每天打开」。",
                    "传话 · 程计：三天都只排 15 分钟极限填空。",
                    "传话 · 温题：热身通过即可打卡，不计入强弱项压力。",
                    "传话 · 析因：节奏恢复后，再评估是否加回夹逼专题。",
                    "依据 · 三日连续打卡",
                    "建议动作 · 已确认可逐步加量",
                ],
                ensure_ascii=False,
            ),
            "status": "resolved",
            "resolution": json.dumps(
                {"action": "ack", "note": "短热身策略有效"},
                ensure_ascii=False,
            ),
        },
    )
    _upsert_bb(
        db,
        "bb_seed_catchup_hist_challenge",
        {
            "user_id": user_id,
            "type": "challenge",
            "summary": "（历史）夹逼草稿只写了一边不等式，被助教拦住补全",
            "severity": "medium",
            "evidence_refs": json.dumps(
                [
                    "传话 · 温题：夹逼必须上下两界同时成立，草稿缺上界。",
                    "传话 · 析因：这和「中途离开」叠在一起，完成率会更差。",
                    "传话 · 安节：今天只订正这一题，别开新专题。",
                    "传话 · 程计：订正完成后才解锁明日热身。",
                    "依据 · 夹逼缺一侧放缩",
                    "建议动作 · 已补全后提交",
                ],
                ensure_ascii=False,
            ),
            "status": "resolved",
            "resolution": json.dumps(
                {"action": "ack", "note": "已补两边放缩"},
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
            {
                "id": "att_catch_004",
                "user_id": user_id,
                "question_id": "math_catch_0001",
                "answer": "按定义说明左右极限都存在且相等",
                "is_correct": True,
                "error_tag": None,
                "duration_ms": 12000,
                "created_at": now - timedelta(days=1, hours=2),
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


FOCUS_USERNAMES = {"math", "phys", "catch", "cs"}
FOCUS_IDS = {
    "u_student_math",
    "u_student_physics",
    "u_student_catchup",
    "u_student_cs",
}
COHORT_COUNT = 47  # 4 重点 + 47 班级同学 = 51
COHORT_PASSWORD = "cohort"

_SURNAMES = list("赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜")
_GIVEN = [
    "一诺",
    "子墨",
    "雨桐",
    "浩然",
    "思远",
    "嘉怡",
    "明轩",
    "诗涵",
    "俊杰",
    "欣怡",
    "宇轩",
    "婉清",
    "博文",
    "语嫣",
    "天佑",
    "若曦",
    "立诚",
    "雅琴",
    "景行",
    "沐阳",
]

_MATH_QIDS = [
    "math_lim_001",
    "math_lim_002",
    "math_cont_001",
    "math_inf_001",
    "math_a1c01_0001",
    "math_a1c01_0002",
    "math_a1c02_0001",
]
_PHYS_QIDS = [
    "physics_mech_0001",
    "physics_mech_0002",
    "physics_mech_0003",
    "physics_mech_0004",
    "physics_mech_0005",
    "phy_fric_001",
    "phy_new_001",
]
_ERROR_TAGS = [
    "公式误用",
    "遗漏假设",
    "放缩方向",
    "边界条件",
    "概念不清",
    "方向判断",
    "中途离开",
    None,
    None,
]


def _cohort_name(index: int) -> str:
    return _SURNAMES[index % len(_SURNAMES)] + _GIVEN[index % len(_GIVEN)]


def _cleanup_non_roster_students(db) -> None:
    """只保留重点账号 + 47 名班级同学 + admin；清掉旧的统计填充账号。"""
    keep_ids = set(FOCUS_IDS) | {f"u_cohort_{i:02d}" for i in range(1, COHORT_COUNT + 1)} | {
        "u_admin"
    }
    keep_names = FOCUS_USERNAMES | {f"s{i:02d}" for i in range(1, COHORT_COUNT + 1)} | {
        "admin"
    }
    rows = list(db.scalars(select(User)).all())
    for user in rows:
        if user.role != "student":
            continue
        if user.id in keep_ids or (user.username and user.username in keep_names):
            continue
        db.execute(delete(Attempt).where(Attempt.user_id == user.id))
        db.execute(delete(BlackboardEntry).where(BlackboardEntry.user_id == user.id))
        db.execute(delete(Plan).where(Plan.user_id == user.id))
        db.execute(delete(AiCallLog).where(AiCallLog.user_id == user.id))
        db.delete(user)
    # 显式清掉旧 stats_pad
    pad = db.get(User, "u_stats_pad")
    if pad is not None:
        db.execute(delete(Attempt).where(Attempt.user_id == "u_stats_pad"))
        db.delete(pad)


def _seed_cohort_students(db) -> int:
    """生成班级其余同学：有计划 / 作答 / 少量提醒，供管理端统计与班级对照。"""
    now = datetime.now(timezone.utc)
    created = 0
    for i in range(1, COHORT_COUNT + 1):
        uid = f"u_cohort_{i:02d}"
        username = f"s{i:02d}"
        subject = "physics" if i % 3 == 0 else "math"
        scenario = "final_review" if i % 2 == 0 else "catch_up"
        qids = _PHYS_QIDS if subject == "physics" else _MATH_QIDS
        display = _cohort_name(i - 1)

        user = db.get(User, uid)
        if user is None:
            user = db.scalar(select(User).where(User.username == username))
        if user is None:
            user = User(id=uid)
            db.add(user)
            created += 1
        user.id = uid
        user.username = username
        user.display_name = display
        user.role = "student"
        user.password_hash = hash_password(COHORT_PASSWORD)
        user.demo_time_jump_days = 0

        days_left = 5 + (i % 10)
        budget = 30 + (i % 5) * 10
        plan = {
            "scenario": scenario,
            "goal": (
                "期末过线巩固"
                if scenario == "final_review"
                else "跟课补齐章节缺口"
            ),
            "daily_minutes_budget": budget,
            "days_left": days_left,
            "tasks": [
                _task(
                    1,
                    "练习",
                    "章节基础题",
                    min(budget, 25 + (i % 4) * 5),
                    "完成当日基础练习",
                    "medium",
                    "physics.mech.ch02" if subject == "physics" else "math.a1.ch02",
                    subject,
                    status="done" if i % 4 else "todo",
                ),
                _task(
                    2,
                    "回看",
                    "错题整理",
                    min(budget, 20),
                    "整理 1–2 道错题",
                    "low",
                    "physics.mech.ch02" if subject == "physics" else "math.a1.ch02",
                    subject,
                ),
            ],
            "_demo": {
                "plan_status": "ok",
                "plan_message": "班级同学常规学习安排",
                "cohort": True,
                "setup": {
                    "mode": scenario,
                    "subject": subject,
                    "dailyMinutes": budget,
                    "examDate": "2026-11-22" if scenario == "final_review" else "2026-12-18",
                    "chapter": (
                        "大学物理 · 力学"
                        if subject == "physics"
                        else "高等数学 · 极限与连续"
                    ),
                },
            },
        }
        _upsert_plan(db, uid, plan)

        attempt_n = 3 + (i % 8)  # 3..10
        rows = []
        for k in range(attempt_n):
            qid = qids[(i + k) % len(qids)]
            tag = _ERROR_TAGS[(i + k) % len(_ERROR_TAGS)]
            roll = (i * 3 + k * 7) % 10
            if roll <= 5:
                correct: bool | None = True
                tag = None
            elif roll <= 8:
                correct = False
            else:
                correct = None
            rows.append(
                {
                    "id": f"att_cohort_{i:02d}_{k:02d}",
                    "user_id": uid,
                    "question_id": qid,
                    "answer": "cohort",
                    "is_correct": correct,
                    "error_tag": tag if correct is False else None,
                    "duration_ms": 8000 + (i + k) * 700,
                    "created_at": now
                    - timedelta(days=(i + k) % 14, hours=(k * 3) % 20, minutes=i % 50),
                }
            )
        _replace_attempts(db, uid, rows)

        # 约 1/3 同学有提醒，丰富管理端分布
        if i % 3 == 1:
            bb_type = ["conflict", "challenge", "intervention"][(i // 3) % 3]
            summary = {
                "conflict": f"{display} 的今日任务略超每日时间预算",
                "challenge": f"{display} 近一次作答可能遗漏关键条件",
                "intervention": f"{display} 连续两天练习偏少，建议短任务恢复",
            }[bb_type]
            _upsert_bb(
                db,
                f"bb_cohort_{i:02d}",
                {
                    "user_id": uid,
                    "type": bb_type,
                    "summary": summary,
                    "severity": "medium" if bb_type != "conflict" else "high",
                    "evidence_refs": json.dumps(
                        [f"同学 · {display}", f"科目 · {subject}"],
                        ensure_ascii=False,
                    ),
                    "status": "open" if i % 2 else "resolved",
                    "resolution": (
                        None
                        if i % 2
                        else json.dumps(
                            {"action": "ack", "note": "已读"},
                            ensure_ascii=False,
                        )
                    ),
                },
            )

        if i % 11 == 0:
            _ensure_ai_log(
                db,
                user_id=uid,
                intent="create_plan",
                request_id=f"seed_cohort_cp_{i:02d}",
                status="ok",
                response={"status": "ok"},
            )
        if i % 13 == 0:
            _ensure_ai_log(
                db,
                user_id=uid,
                intent="verify_answer",
                request_id=f"seed_cohort_vf_{i:02d}",
                status="ok",
                response={"status": "ok"},
            )
    return created


def _seed_cs_python(db, user_id: str) -> None:
    """江予澈：计概 Python —— 今晚任务超时需确认 + 沙箱练习画像。"""
    _reset_user_learning_state(db, user_id)
    plan = {
        "scenario": "catch_up",
        "goal": "两周内打通 Python 基础与算法入门，能独立完成洛谷入门题",
        "daily_minutes_budget": 50,
        "days_left": 14,
        "tasks": [
            _task(
                1,
                "练习",
                "变量与字符串沙箱题",
                25,
                "完成练习台「拼接问候语」「交换变量」并自测通过",
                "low",
                "cs.py.basics",
                "cs",
                status="done",
            ),
            _task(
                2,
                "练习",
                "分支与循环沙箱 + 洛谷入门连刷",
                70,
                "沙箱自测通过，并至少提交 2 道洛谷分支循环题",
                "high",
                "cs.py.control",
                "cs",
                error_tag="off_by_one",
                status="blocked",
            ),
            _task(
                3,
                "练习",
                "列表与字典 · 力扣两数之和热身",
                45,
                "完成列表求和沙箱，并打开力扣 1 题阅读题面",
                "medium",
                "cs.py.structures",
                "cs",
            ),
            _task(
                4,
                "整理",
                "函数封装与边界条件笔记",
                30,
                "写清 larger/fact 的边界用例各 2 个",
                "low",
                "cs.py.functions",
                "cs",
            ),
            _task(
                5,
                "模拟",
                "算法思维：递推小测",
                35,
                "阶乘沙箱通过 + 斐波那契题面走读",
                "high",
                "cs.py.algorithm",
                "cs",
            ),
        ],
        "_demo": {
            "plan_status": "conflict",
            "plan_message": "今晚只剩 50 分钟，但「分支与循环沙箱 + 洛谷入门连刷」约需 70 分钟，需要先决定怎么改今晚安排。",
            "user_options": CS_OPTIONS,
            "selected_option_id": "reduce_depth",
            "show_intervention": False,
            "setup": {
                "mode": "catch_up",
                "subject": "cs",
                "dailyMinutes": 50,
                "examDate": "2026-12-10",
                "chapter": "计概 · Python 基础与算法入门",
            },
            "persona": {
                "real_name": "江予澈",
                "major": "人工智能 · 2025 级",
                "course": "计算与人工智能概论（Python）",
                "semester": "大一上 · 计概同步练习",
                "focus": "语法能写，但报错读不懂；今晚任务又排超了",
                "weak_points": [
                    "IndentationError / NameError 看到就慌",
                    "循环边界 off-by-one",
                    "不会把沙箱题迁移到洛谷输入输出格式",
                ],
                "next_action": "先确认今晚怎么安排，再去沙箱过分支循环自测",
                "next_path": "/plan",
                "chat_greeting": "予澈你好。今晚「分支循环 + 洛谷连刷」看起来会超出你设定的 50 分钟。要不要先一起看看怎么改今晚的安排？",
                "quick_asks": [
                    "今晚时间不够怎么办",
                    "这段报错什么意思",
                    "沙箱和洛谷有啥区别",
                    "给我一个提示",
                ],
                "recent_days": [
                    {"when": "前天 21:10", "text": "变量题自测通过"},
                    {"when": "昨天 20:40", "text": "循环题 IndentationError 卡住 12 分钟"},
                    {"when": "今天 16:05", "text": "准备练分支，计划里又叠了两道洛谷"},
                ],
                "mastery": [
                    {"label": "变量字符串", "value": 78},
                    {"label": "分支循环", "value": 46},
                    {"label": "列表字典", "value": 38},
                    {"label": "函数", "value": 35},
                    {"label": "算法入门", "value": 28},
                ],
                "question_notes": [
                    {"question_id": "cs_local_two_sum", "title": "两数之和下标"},
                    {"question_id": "cs_local_jump_game", "title": "跳跃游戏"},
                    {"question_id": "cs_local_coin", "title": "零钱兑换"},
                    {"question_id": "ext_leetcode_322", "title": "力扣 322 零钱兑换"},
                ],
                "materials_focus": "计概课件：列表字典 + 算法思维",
            },
        },
    }
    _upsert_plan(db, user_id, plan)
    _upsert_bb(
        db,
        "bb_seed_cs_conflict",
        {
            "user_id": user_id,
            "type": "conflict",
            "summary": "今晚「分支循环 + 洛谷连刷」约需 70 分钟，超过你设定的每日 50 分钟",
            "severity": "high",
            "evidence_refs": json.dumps(
                [
                    "传话 · 程计：第 2 天任务估时 70 分钟，已经顶破每日 50 分钟预算。",
                    "传话 · 安节：别直接砍整晚，给三个选项——先过沙箱 / 顺延洛谷 / 临时加时。",
                    "传话 · 析因：记下这次拍板，下周排期避开「沙箱+平台」叠压。",
                    "依据 · 第 2 天「分支与循环沙箱 + 洛谷入门连刷」约 70 分钟",
                    "约束 · 每日可用时间 ≤ 50 分钟",
                    "建议动作 · 打开学习计划，选择压缩任务或顺延",
                ],
                ensure_ascii=False,
            ),
            "status": "open",
            "resolution": None,
        },
    )
    _upsert_bb(
        db,
        "bb_seed_cs_python",
        {
            "user_id": user_id,
            "type": "challenge",
            "summary": "跳跃游戏草稿用了 O(n²) 穷举，沙箱能过但超时风险高；建议改成维护最远可达",
            "severity": "medium",
            "evidence_refs": json.dumps(
                [
                    "传话 · 码小助：自测能过，但双重循环在长数组上会炸。",
                    "传话 · 温题：这题核心是维护 far=max(far, i+step)，一次扫描即可。",
                    "传话 · 析因：把「能跑通≠够快」记进错因，下一题先问复杂度。",
                    "依据 · 跳跃游戏沙箱出现超时倾向写法",
                    "依据 · 中断前未完成进阶自测",
                    "建议动作 · 确认今晚安排后，再打开 Python 练习台对照",
                ],
                ensure_ascii=False,
            ),
            "status": "open",
            "resolution": None,
        },
    )
    _upsert_bb(
        db,
        "bb_seed_cs_hist_hash",
        {
            "user_id": user_id,
            "type": "hypothesis",
            "summary": "（历史）两数之和：先哈希再暴力，正确率与耗时都改善",
            "severity": "low",
            "evidence_refs": json.dumps(
                [
                    "传话 · 码小助：双重循环能过样例，但 O(n²) 会在长数组翻车。",
                    "传话 · 温题：标准解是一边扫一边查 target-x。",
                    "传话 · 析因：把「先问复杂度」写进错因卡。",
                    "传话 · 程计：明日练习保留一题哈希表热身。",
                    "依据 · two_sum 暴力通过自测",
                    "建议动作 · 已对照参考实现复盘",
                ],
                ensure_ascii=False,
            ),
            "status": "resolved",
            "resolution": json.dumps(
                {"action": "ack", "note": "已改用哈希写法"},
                ensure_ascii=False,
            ),
        },
    )
    _upsert_bb(
        db,
        "bb_seed_cs_hist_debug",
        {
            "user_id": user_id,
            "type": "intervention",
            "summary": "（历史）IndentationError 卡住 40 分钟后，改成「先跑通再优化」",
            "severity": "medium",
            "evidence_refs": json.dumps(
                [
                    "传话 · 安节：同一报错停留过久，情绪成本上升。",
                    "传话 · 码小助：先把 for 循环缩进对齐，别急着写最优解。",
                    "传话 · 温题：通过自测后再谈复杂度。",
                    "传话 · 程计：今天任务收成「跑通 1 题」。",
                    "依据 · IndentationError 停留 40min",
                    "建议动作 · 已用短目标重启",
                ],
                ensure_ascii=False,
            ),
            "status": "resolved",
            "resolution": json.dumps(
                {"action": "ack", "note": "已先跑通再优化"},
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
                "id": "att_cs_hello",
                "user_id": user_id,
                "question_id": "cs_local_two_sum",
                "answer": "用双重循环找两数之和，未用哈希表",
                "is_correct": True,
                "error_tag": None,
                "duration_ms": 480000,
                "created_at": now - timedelta(days=2),
            },
            {
                "id": "att_cs_loop",
                "user_id": user_id,
                "question_id": "cs_local_jump_game",
                "answer": "穷举所有跳跃路径，未维护最远可达",
                "is_correct": False,
                "error_tag": "complexity",
                "duration_ms": 900000,
                "created_at": now - timedelta(days=1),
            },
        ],
    )
    _ensure_ai_log(
        db,
        user_id=user_id,
        intent="create_plan",
        request_id="seed_cs_create_plan",
        status="ok",
        response={"status": "ok", "scenario": "cs_python"},
    )


FOCUS_SEEDERS = {
    "u_student_math": "_seed_math_conflict",
    "u_student_physics": "_seed_physics_ok",
    "u_student_catchup": "_seed_catchup_intervention",
    "u_student_cs": "_seed_cs_python",
}


def reseed_focus_user(db, user_id: str) -> bool:
    """仅恢复四个答辩预设账号的开场数据；返回是否命中。"""
    table = {
        "u_student_math": _seed_math_conflict,
        "u_student_physics": _seed_physics_ok,
        "u_student_catchup": _seed_catchup_intervention,
        "u_student_cs": _seed_cs_python,
    }
    fn = table.get(user_id)
    if fn is None:
        return False
    fn(db, user_id)
    return True


def seed_demo_accounts() -> dict:
    init_db()
    with SessionLocal() as db:
        _cleanup_non_roster_students(db)
        for spec in ACCOUNTS:
            _upsert_user(db, spec)
        db.flush()
        _seed_math_conflict(db, "u_student_math")
        _seed_physics_ok(db, "u_student_physics")
        _seed_catchup_intervention(db, "u_student_catchup")
        _seed_cs_python(db, "u_student_cs")
        cohort_created = _seed_cohort_students(db)
        db.commit()
        student_total = len(
            list(db.scalars(select(User).where(User.role == "student")).all())
        )
    return {
        "focus": [a["username"] for a in ACCOUNTS if a["role"] == "student"],
        "cohort_created": cohort_created,
        "students_total": student_total,
        "admin": "admin",
    }


def main() -> int:
    stats = seed_demo_accounts()
    print("seeded demo accounts:", stats)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
