"""管理员只读统计。"""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.models import AiCallLog, Attempt, BlackboardEntry, Plan, User
from app.db.session import get_db

router = APIRouter(tags=["admin"])


@router.get("/api/admin/stats")
def admin_stats(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    user_total = db.scalar(select(func.count()).select_from(User)) or 0
    student_n = (
        db.scalar(select(func.count()).select_from(User).where(User.role == "student"))
        or 0
    )
    admin_n = (
        db.scalar(select(func.count()).select_from(User).where(User.role == "admin"))
        or 0
    )

    attempt_total = db.scalar(select(func.count()).select_from(Attempt)) or 0
    plan_total = db.scalar(select(func.count()).select_from(Plan)) or 0
    bb_total = db.scalar(select(func.count()).select_from(BlackboardEntry)) or 0
    ai_total = db.scalar(select(func.count()).select_from(AiCallLog)) or 0

    # 作答正确性分布
    correct_rows = db.execute(
        select(Attempt.is_correct, func.count()).group_by(Attempt.is_correct)
    ).all()
    attempt_correctness = {
        ("null" if k is None else ("true" if k else "false")): int(v)
        for k, v in correct_rows
    }

    # 黑板 type / status
    bb_type = {
        str(k): int(v)
        for k, v in db.execute(
            select(BlackboardEntry.type, func.count()).group_by(BlackboardEntry.type)
        ).all()
        if k is not None
    }
    bb_status = {
        str(k): int(v)
        for k, v in db.execute(
            select(BlackboardEntry.status, func.count()).group_by(
                BlackboardEntry.status
            )
        ).all()
        if k is not None
    }

    # AI intent 分布
    ai_intent = {
        str(k): int(v)
        for k, v in db.execute(
            select(AiCallLog.intent, func.count()).group_by(AiCallLog.intent)
        ).all()
        if k is not None
    }

    # 计划 scenario 分布（从 snapshot JSON）
    scenario_counter: Counter[str] = Counter()
    for (snap,) in db.execute(select(Plan.snapshot)).all():
        try:
            data = json.loads(snap or "{}")
        except json.JSONDecodeError:
            data = {}
        scenario = data.get("scenario") if isinstance(data, dict) else None
        scenario_counter[str(scenario or "unknown")] += 1

    # 近 7 日 attempts
    now = datetime.now(timezone.utc)
    day_buckets: list[dict[str, Any]] = []
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date()
        start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        n = (
            db.scalar(
                select(func.count())
                .select_from(Attempt)
                .where(Attempt.created_at >= start, Attempt.created_at < end)
            )
            or 0
        )
        day_buckets.append({"date": day.isoformat(), "attempts": int(n)})

    # 题目科目粗分：question_id 前缀
    subject_counter: Counter[str] = Counter()
    for (qid,) in db.execute(select(Attempt.question_id)).all():
        q = str(qid or "")
        if q.startswith("math") or "math" in q:
            subject_counter["math"] += 1
        elif q.startswith("physics") or "phys" in q:
            subject_counter["physics"] += 1
        else:
            subject_counter["other"] += 1

    users_preview = [
        {
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in db.scalars(select(User).order_by(User.created_at.desc()).limit(20)).all()
    ]

    return {
        "users": {
            "total": int(user_total),
            "students": int(student_n),
            "admins": int(admin_n),
            "preview": users_preview,
        },
        "plans": {"total": int(plan_total), "by_scenario": dict(scenario_counter)},
        "attempts": {
            "total": int(attempt_total),
            "by_correctness": attempt_correctness,
            "by_subject": dict(subject_counter),
            "last_7_days": day_buckets,
        },
        "blackboard": {
            "total": int(bb_total),
            "by_type": bb_type,
            "by_status": bb_status,
        },
        "ai_calls": {"total": int(ai_total), "by_intent": ai_intent},
    }
