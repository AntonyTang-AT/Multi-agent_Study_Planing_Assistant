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

FOCUS_STUDENT_IDS = {
    "u_student_math",
    "u_student_physics",
    "u_student_catchup",
}


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

    # 错因分布
    error_counter: Counter[str] = Counter()
    for (tag,) in db.execute(select(Attempt.error_tag)).all():
        if tag:
            error_counter[str(tag)] += 1

    # 学生活跃度（重点学生置顶）
    student_rows = []
    for u in db.scalars(
        select(User).where(User.role == "student").order_by(User.created_at.desc())
    ).all():
        att_n = (
            db.scalar(
                select(func.count())
                .select_from(Attempt)
                .where(Attempt.user_id == u.id)
            )
            or 0
        )
        ok_n = (
            db.scalar(
                select(func.count())
                .select_from(Attempt)
                .where(Attempt.user_id == u.id, Attempt.is_correct.is_(True))
            )
            or 0
        )
        open_bb = (
            db.scalar(
                select(func.count())
                .select_from(BlackboardEntry)
                .where(
                    BlackboardEntry.user_id == u.id,
                    BlackboardEntry.status == "open",
                )
            )
            or 0
        )
        student_rows.append(
            {
                "id": u.id,
                "username": u.username,
                "display_name": u.display_name,
                "is_focus": u.id in FOCUS_STUDENT_IDS,
                "attempts": int(att_n),
                "passed": int(ok_n),
                "pass_rate": round((ok_n / att_n) * 100, 1) if att_n else 0.0,
                "open_reminders": int(open_bb),
            }
        )
    student_rows.sort(
        key=lambda row: (0 if row["is_focus"] else 1, -(row["attempts"] or 0))
    )

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

    correct_n = int(attempt_correctness.get("true", 0))
    wrong_n = int(attempt_correctness.get("false", 0))
    pending_n = int(attempt_correctness.get("null", 0))
    judged = correct_n + wrong_n
    overall_pass_rate = round((correct_n / judged) * 100, 1) if judged else 0.0

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
            "by_error_tag": dict(error_counter.most_common(8)),
            "last_7_days": day_buckets,
            "pass_rate": overall_pass_rate,
            "judged": judged,
            "pending": pending_n,
        },
        "blackboard": {
            "total": int(bb_total),
            "by_type": bb_type,
            "by_status": bb_status,
        },
        "ai_calls": {"total": int(ai_total), "by_intent": ai_intent},
        "students": student_rows,
    }
