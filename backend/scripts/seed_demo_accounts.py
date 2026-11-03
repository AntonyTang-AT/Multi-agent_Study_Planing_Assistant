"""预置演示账号与个人场景数据。

用法（在 backend/ 下）::

    python -m scripts.seed_demo_accounts

每个学生账号带完整 PlanTask、作答痕迹与黑板条目，便于答辩切换身份展示。
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

# 演示口令刻意简短，方便答辩现场手输；同机也可用登录页芯片一键填入
DEMO_PASSWORD = "demo"
ADMIN_PASSWORD = "admin"

ACCOUNTS = [
    {
        "id": "u_student_math",
        "username": "math",
        "display_name": "高数期末生",
        "role": "student",
        "password": DEMO_PASSWORD,
        "scenario": "final_review",
        "subject": "math",
    },
    {
        "id": "u_student_physics",
        "username": "phys",
        "display_name": "大物跟课生",
        "role": "student",
        "password": DEMO_PASSWORD,
        "scenario": "catch_up",
        "subject": "physics",
    },
    {
        "id": "u_student_catchup",
        "username": "catch",
        "display_name": "进度落后生",
        "role": "student",
        "password": DEMO_PASSWORD,
        "scenario": "catch_up",
        "subject": "math",
    },
    {
        "id": "u_admin",
        "username": "admin",
        "display_name": "平台管理员",
        "role": "admin",
        "password": ADMIN_PASSWORD,
        "scenario": None,
        "subject": None,
    },
]

MATH_OPTIONS = [
    {"id": "extend_time", "label": "延长每日学习时间"},
    {"id": "reduce_depth", "label": "降低复习深度"},
    {"id": "adjust_goal", "label": "调整目标"},
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
    if spec["username"] == "catch":
        user.demo_time_jump_days = 3
    else:
        user.demo_time_jump_days = 0
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
    exists = db.scalar(
        select(AiCallLog).where(AiCallLog.request_id == request_id)
    )
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
    """期末高数：第 3 天超时冲突，等待用户裁决。"""
    plan = {
        "scenario": "final_review",
        "goal": "期末过线并补齐极限链路",
        "daily_minutes_budget": 45,
        "days_left": 7,
        "tasks": [
            _task(
                1,
                "回看",
                "极限定义与邻域语言",
                20,
                "能用 ε-δ 语言口述极限定义，并写出 2 个反例",
                "low",
                "math.a1.ch02",
                "math",
            ),
            _task(
                2,
                "练习",
                "重要极限与夹逼定理",
                40,
                "完成 4 道基础题，标出放缩方向",
                "medium",
                "math.a1.ch02",
                "math",
                error_tag="formula_misuse",
            ),
            _task(
                3,
                "整理",
                "连续性证明卡片（高负荷）",
                60,
                "完成证明卡片并标注依据；当前超出每日 45 分钟预算",
                "high",
                "math.a1.ch04",
                "math",
            ),
        ],
        "_demo": {
            "plan_status": "conflict",
            "plan_message": "第 3 天任务 60 分钟超出每日 45 分钟硬约束，请选择裁决项",
            "user_options": MATH_OPTIONS,
            "selected_option_id": "reduce_depth",
            "show_intervention": False,
            "setup": {
                "mode": "final_review",
                "subject": "math",
                "dailyMinutes": 45,
                "examDate": "2026-11-22",
                "chapter": "第 2 章 · 极限与连续",
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
            "summary": "计划第 3 天（连续性证明）60 分钟超出每日 45 分钟预算",
            "severity": "high",
            "evidence_refs": json.dumps(
                ["plan#day3", "constraint#daily_minutes<=45"], ensure_ascii=False
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
                "id": "att_math_001",
                "user_id": user_id,
                "question_id": "math_a1c01_0001",
                "answer": "误用洛必达",
                "is_correct": False,
                "error_tag": "formula_misuse",
                "duration_ms": 42000,
                "created_at": now - timedelta(days=2, hours=3),
            },
            {
                "id": "att_math_002",
                "user_id": user_id,
                "question_id": "math_a1c01_0002",
                "answer": "夹逼成立",
                "is_correct": True,
                "error_tag": None,
                "duration_ms": 28000,
                "created_at": now - timedelta(days=1, hours=5),
            },
            {
                "id": "att_math_003",
                "user_id": user_id,
                "question_id": "math_a1c02_0001",
                "answer": "abstain",
                "is_correct": None,
                "error_tag": "uncertain_assumption",
                "duration_ms": 15000,
                "created_at": now - timedelta(hours=6),
            },
        ],
    )
    _ensure_ai_log(
        db,
        user_id=user_id,
        intent="create_plan",
        request_id="seed_math_cp",
        status="conflict",
        response={"status": "conflict", "message": "daily budget overflow"},
    )


def _seed_physics_ok(db, user_id: str) -> None:
    """大物跟课：计划已通过，作答混杂，存在结构化质疑。"""
    plan = {
        "scenario": "catch_up",
        "goal": "跟上力学进度并补齐受力分析",
        "daily_minutes_budget": 60,
        "days_left": 10,
        "tasks": [
            _task(
                1,
                "回看",
                "质点运动学：位移与速度",
                25,
                "能区分平均速度与瞬时速度，完成 1 页笔记",
                "low",
                "physics.mech.ch01",
                "physics",
            ),
            _task(
                2,
                "练习",
                "牛顿定律受力分析",
                50,
                "独立画出 3 个受力图并写出方程",
                "medium",
                "physics.mech.ch02",
                "physics",
                error_tag="missing_assumption",
            ),
            _task(
                3,
                "整理",
                "摩擦力与斜面综合",
                40,
                "整理易错假设清单，标注何时可忽略摩擦",
                "medium",
                "physics.mech.ch02",
                "physics",
            ),
        ],
        "_demo": {
            "plan_status": "ok",
            "plan_message": "计划已通过规则审计，可继续练习验证",
            "user_options": [],
            "selected_option_id": "",
            "show_intervention": False,
            "setup": {
                "mode": "catch_up",
                "subject": "physics",
                "dailyMinutes": 60,
                "examDate": "2026-12-10",
                "chapter": "第 2 章 · 牛顿运动定律",
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
            "summary": "受力分析草稿遗漏摩擦力假设，校验 Agent 发起结构化质疑",
            "severity": "medium",
            "evidence_refs": json.dumps(
                ["attempt#physics_mech_0003", "verify#assumption_check"],
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
                "answer": "v=at",
                "is_correct": True,
                "error_tag": None,
                "duration_ms": 18000,
                "created_at": now - timedelta(days=3),
            },
            {
                "id": "att_phy_002",
                "user_id": user_id,
                "question_id": "physics_mech_0002",
                "answer": "ΣF=ma",
                "is_correct": True,
                "error_tag": None,
                "duration_ms": 22000,
                "created_at": now - timedelta(days=2),
            },
            {
                "id": "att_phy_003",
                "user_id": user_id,
                "question_id": "physics_mech_0003",
                "answer": "忽略摩擦",
                "is_correct": False,
                "error_tag": "missing_assumption",
                "duration_ms": 35000,
                "created_at": now - timedelta(days=1),
            },
            {
                "id": "att_phy_004",
                "user_id": user_id,
                "question_id": "physics_mech_0004",
                "answer": "待确认",
                "is_correct": None,
                "error_tag": "uncertain_assumption",
                "duration_ms": 12000,
                "created_at": now - timedelta(hours=4),
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
    """进度落后：时间跳跃后触发主动干预。"""
    plan = {
        "scenario": "catch_up",
        "goal": "两天未练后的低门槛恢复",
        "daily_minutes_budget": 40,
        "days_left": 5,
        "tasks": [
            _task(
                1,
                "回看",
                "极限复习 · 10 分钟热身",
                15,
                "重读昨日错题卡片，写出 1 条恢复动作",
                "low",
                "math.a1.ch02",
                "math",
            ),
            _task(
                2,
                "练习",
                "基础极限计算（缩短版）",
                25,
                "完成 2 道低难度题即可结束本日",
                "low",
                "math.a1.ch02",
                "math",
            ),
        ],
        "_demo": {
            "plan_status": "ok",
            "plan_message": "已生成恢复计划；请先处理主动干预卡片",
            "user_options": [],
            "selected_option_id": "",
            "show_intervention": True,
            "setup": {
                "mode": "catch_up",
                "subject": "math",
                "dailyMinutes": 40,
                "examDate": "2026-11-30",
                "chapter": "第 2 章 · 极限（补漏）",
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
            "summary": "检测到连续 2 天未练习（演示时间跳跃 +3 天），建议缩短单次任务并恢复节奏",
            "severity": "medium",
            "evidence_refs": json.dumps(
                ["demo#time_jump_days=3", "trace#idle", "plan#recover"],
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
                "answer": "skip",
                "is_correct": None,
                "error_tag": "motivation_drop",
                "duration_ms": 5000,
                "created_at": now - timedelta(days=4),
            },
            {
                "id": "att_catch_002",
                "user_id": user_id,
                "question_id": "math_a1c01_0002",
                "answer": "半对",
                "is_correct": False,
                "error_tag": "formula_misuse",
                "duration_ms": 20000,
                "created_at": now - timedelta(days=3, hours=8),
            },
        ],
    )
    _ensure_ai_log(
        db,
        user_id=user_id,
        intent="proactive_intervention",
        request_id="seed_catchup_pi",
        status="need_user",
        response={"status": "need_user", "message": "resume with short task"},
    )


def _seed_extra_distribution(db) -> None:
    """补充合成 attempts，让管理员看板近 7 日分布更饱满。"""
    now = datetime.now(timezone.utc)
    for day in range(7):
        for j in range(2):
            aid = f"att_synth_{day}_{j}"
            if db.get(Attempt, aid) is not None:
                continue
            uid = "u_student_math" if j % 2 == 0 else "u_student_physics"
            db.add(
                Attempt(
                    id=aid,
                    user_id=uid,
                    question_id=(
                        f"math_synth_{day}_{j}"
                        if j % 2 == 0
                        else f"physics_synth_{day}_{j}"
                    ),
                    answer="synth",
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
        _seed_extra_distribution(db)
        db.commit()
    return {"accounts": [a["username"] for a in ACCOUNTS]}


def main() -> int:
    stats = seed_demo_accounts()
    print("seeded demo accounts:", stats)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
