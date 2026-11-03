"""计划 / 作答 / 黑板 请求与响应序列化（对齐前端 types）。"""

from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, Field

from app.db.models import Attempt, BlackboardEntry, Plan


def _loads(raw: str | None, default: Any = None) -> Any:
    if raw is None or raw == "":
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def dumps_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


class PlanSnapshot(BaseModel):
    scenario: str | None = None
    goal: str | None = None
    daily_minutes_budget: int | None = None
    days_left: int | None = None
    tasks: list[dict[str, Any]] = Field(default_factory=list)
    arbitration: dict[str, Any] | None = None

    model_config = {"extra": "allow"}


class PlanPutBody(BaseModel):
    """PUT body：直接传 Plan，或包一层 { plan: ... }。"""

    plan: PlanSnapshot | None = None
    scenario: str | None = None
    goal: str | None = None
    daily_minutes_budget: int | None = None
    days_left: int | None = None
    tasks: list[dict[str, Any]] | None = None
    arbitration: dict[str, Any] | None = None

    model_config = {"extra": "allow"}

    def to_snapshot_dict(self) -> dict[str, Any]:
        if self.plan is not None:
            return self.plan.model_dump(exclude_none=False)
        data = self.model_dump(exclude={"plan"}, exclude_none=True)
        if self.model_extra:
            data = {**data, **self.model_extra}
        return data


def plan_snapshot_from_row(row: Plan) -> dict[str, Any]:
    """前端 fetchCurrentPlan / saveCurrentPlan 期望 Plan 本体。"""
    return _loads(row.snapshot, {})


class AttemptCreateBody(BaseModel):
    question_id: str
    answer: str
    error_tag: str | None = None
    duration_ms: int | None = None


def attempt_to_dict(row: Attempt) -> dict[str, Any]:
    return {
        "attempt_id": row.id,
        "question_id": row.question_id,
        "user_id": row.user_id,
        "answer": row.answer,
        "is_correct": None,
        "error_tag": row.error_tag,
        "duration_ms": row.duration_ms,
        "created_at": row.created_at.isoformat() if row.created_at else "",
    }


class BlackboardResolveBody(BaseModel):
    action: str
    note: str | None = None


def blackboard_to_dict(row: BlackboardEntry) -> dict[str, Any]:
    return {
        "entry_id": row.id,
        "type": row.type,
        "summary": row.summary,
        "severity": row.severity,
        "evidence_refs": _loads(row.evidence_refs, []),
        "status": row.status,
        "resolution": _loads(row.resolution, None),
    }
