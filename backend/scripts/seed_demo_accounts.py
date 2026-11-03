"""预置演示账号与个人场景数据。

用法（在 backend/ 下）::

    python -m scripts.seed_demo_accounts
"""

from __future__ import annotations

import json
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select  # noqa: E402

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


def _seed_math_conflict(db, user_id: str) -> None:
    plan = {
        "scenario": "final_review",
        "goal": "期末过线",
        "daily_minutes_budget": 45,
        "days_left": 7,
        "tasks": [
            {"day": 1, "title": "极限定义", "minutes": 40},
            {"day": 2, "title": "重要极限", "minutes": 45},
            {"day": 3, "title": "连续性", "minutes": 60},
        ],
    }
    row = db.scalar(select(Plan).where(Plan.user_id == user_id))
    if row is None:
        db.add(Plan(user_id=user_id, snapshot=json.dumps(plan, ensure_ascii=False)))
    else:
        row.snapshot = json.dumps(plan, ensure_ascii=False)

    eid = "bb_seed_math_conflict"
    bb = db.get(BlackboardEntry, eid)
    fields = {
        "user_id": user_id,
        "type": "conflict",
        "summary": "计划第3天超出每日45分钟预算",
        "severity": "high",
        "evidence_refs": json.dumps(
            ["plan#day3", "constraint#daily_minutes"], ensure_ascii=False
        ),
        "status": "open",
    }
    if bb is None:
        db.add(BlackboardEntry(id=eid, **fields))
    else:
        for k, v in fields.items():
            setattr(bb, k, v)

    n = len(list(db.scalars(select(Attempt).where(Attempt.user_id == user_id)).all()))
    if n == 0:
        now = datetime.now(timezone.utc)
        for i, (qid, correct) in enumerate(
            [
                ("math_a1c01_0001", False),
                ("math_a1c01_0002", True),
                ("math_a1c02_0001", None),
            ]
        ):
            db.add(
                Attempt(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    question_id=qid,
                    answer="demo",
                    is_correct=correct,
                    duration_ms=1000 + i * 200,
                    created_at=now - timedelta(days=2 - i),
                )
            )

    db.add(
        AiCallLog(
            user_id=user_id,
            intent="create_plan",
            request_id="seed_math_cp",
            status="conflict",
            request_body="{}",
            response_body=json.dumps({"status": "conflict"}, ensure_ascii=False),
        )
    )


def _seed_physics_ok(db, user_id: str) -> None:
    plan = {
        "scenario": "catch_up",
        "goal": "跟上力学进度",
        "daily_minutes_budget": 60,
        "days_left": 10,
        "tasks": [
            {"day": 1, "title": "质点运动", "minutes": 50},
            {"day": 2, "title": "牛顿定律", "minutes": 55},
        ],
    }
    row = db.scalar(select(Plan).where(Plan.user_id == user_id))
    if row is None:
        db.add(Plan(user_id=user_id, snapshot=json.dumps(plan, ensure_ascii=False)))
    else:
        row.snapshot = json.dumps(plan, ensure_ascii=False)

    n = len(list(db.scalars(select(Attempt).where(Attempt.user_id == user_id)).all()))
    if n == 0:
        now = datetime.now(timezone.utc)
        for i, (qid, correct) in enumerate(
            [
                ("physics_mech_0001", True),
                ("physics_mech_0002", True),
                ("physics_mech_0003", False),
                ("physics_mech_0004", None),
            ]
        ):
            db.add(
                Attempt(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    question_id=qid,
                    answer="demo",
                    is_correct=correct,
                    error_tag="calculation" if correct is False else None,
                    duration_ms=800 + i * 150,
                    created_at=now - timedelta(days=i),
                )
            )

    eid = "bb_seed_physics_challenge"
    if db.get(BlackboardEntry, eid) is None:
        db.add(
            BlackboardEntry(
                id=eid,
                user_id=user_id,
                type="challenge",
                summary="受力分析遗漏摩擦力假设",
                severity="medium",
                evidence_refs=json.dumps(["attempt#physics_mech_0003"], ensure_ascii=False),
                status="open",
            )
        )

    db.add(
        AiCallLog(
            user_id=user_id,
            intent="verify_answer",
            request_id="seed_phy_vf",
            status="ok",
            request_body="{}",
            response_body=json.dumps({"status": "ok"}, ensure_ascii=False),
        )
    )


def _seed_catchup_intervention(db, user_id: str) -> None:
    plan = {
        "scenario": "catch_up",
        "goal": "两天未练后的干预",
        "daily_minutes_budget": 40,
        "days_left": 5,
        "tasks": [{"day": 1, "title": "极限复习", "minutes": 35}],
    }
    row = db.scalar(select(Plan).where(Plan.user_id == user_id))
    if row is None:
        db.add(Plan(user_id=user_id, snapshot=json.dumps(plan, ensure_ascii=False)))
    else:
        row.snapshot = json.dumps(plan, ensure_ascii=False)

    eid = "bb_seed_catchup_intervention"
    if db.get(BlackboardEntry, eid) is None:
        db.add(
            BlackboardEntry(
                id=eid,
                user_id=user_id,
                type="intervention",
                summary="检测到两天未练习，建议缩短单次任务并恢复节奏",
                severity="medium",
                evidence_refs=json.dumps(
                    ["demo#time_jump_days", "trace#idle"], ensure_ascii=False
                ),
                status="open",
            )
        )

    n = len(list(db.scalars(select(Attempt).where(Attempt.user_id == user_id)).all()))
    if n == 0:
        db.add(
            Attempt(
                id=str(uuid.uuid4()),
                user_id=user_id,
                question_id="math_a1c01_0001",
                answer="skip",
                is_correct=None,
                duration_ms=500,
                created_at=datetime.now(timezone.utc) - timedelta(days=3),
            )
        )

    db.add(
        AiCallLog(
            user_id=user_id,
            intent="proactive_intervention",
            request_id="seed_catchup_pi",
            status="need_user",
            request_body="{}",
            response_body=json.dumps({"status": "need_user"}, ensure_ascii=False),
        )
    )


def _seed_extra_distribution(db) -> None:
    """补充若干合成 attempts，让管理员看板分布更饱满。"""
    now = datetime.now(timezone.utc)
    synthetic_user = db.get(User, "u_student_math")
    if synthetic_user is None:
        return
    # add dated attempts across last 7 days if overall attempts low
    total = len(list(db.scalars(select(Attempt)).all()))
    if total >= 20:
        return
    for day in range(7):
        for j in range(2):
            db.add(
                Attempt(
                    id=str(uuid.uuid4()),
                    user_id="u_student_math" if j % 2 == 0 else "u_student_physics",
                    question_id=(
                        f"math_synth_{day}_{j}"
                        if j % 2 == 0
                        else f"physics_synth_{day}_{j}"
                    ),
                    answer="synth",
                    is_correct=bool((day + j) % 3),
                    duration_ms=900,
                    created_at=now - timedelta(days=day, hours=j),
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
