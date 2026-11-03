"""B5：Agent 成功响应落库（AiCallLog / 黑板 / 计划草稿）。

不做智能分支：不改写 status、不消冲突、不改答案；仅持久化 Agent 原样字段。
"""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import AiCallLog, BlackboardEntry, Plan


def _dumps(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False)


def persist_ai_success(
    db: Session,
    *,
    user_id: str | None,
    intent: str,
    request_payload: dict[str, Any],
    response: dict[str, Any],
) -> str:
    """写 AiCallLog；若有 user_id，再写黑板条目与 plan 草稿。"""
    log = AiCallLog(
        user_id=user_id,
        intent=intent,
        request_id=_as_str(response.get("request_id") or request_payload.get("request_id")),
        task_id=_as_str(response.get("task_id") or request_payload.get("task_id")),
        status=_as_str(response.get("status")),
        request_body=_dumps(request_payload),
        response_body=_dumps(response),
    )
    db.add(log)

    if user_id:
        _upsert_blackboard(db, user_id, response.get("blackboard_entries"))
        _upsert_plan_draft(db, user_id, response.get("output"))

    db.flush()
    return log.id


def _as_str(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def _upsert_blackboard(db: Session, user_id: str, entries: Any) -> None:
    if not isinstance(entries, list):
        return
    for raw in entries:
        if not isinstance(raw, dict):
            continue
        entry_id = raw.get("entry_id") or raw.get("id")
        if not entry_id:
            continue
        entry_id = str(entry_id)
        row = db.get(BlackboardEntry, entry_id)
        evidence = raw.get("evidence_refs") or []
        fields = {
            "user_id": user_id,
            "type": str(raw.get("type") or "conflict"),
            "summary": str(raw.get("summary") or ""),
            "severity": str(raw.get("severity") or "medium"),
            "evidence_refs": _dumps(evidence if isinstance(evidence, list) else []),
            "status": str(raw.get("status") or "open"),
        }
        if row is None:
            db.add(BlackboardEntry(id=entry_id, **fields))
        else:
            for key, value in fields.items():
                if key == "status" and row.status == "resolved":
                    continue
                setattr(row, key, value)


def _upsert_plan_draft(db: Session, user_id: str, output: Any) -> None:
    """将 output.plan 写入 plans 草稿快照（冲突稿也落库，供可追溯）。"""
    if not isinstance(output, dict):
        return
    plan = output.get("plan")
    if not isinstance(plan, dict) or not plan:
        return
    row = db.scalar(select(Plan).where(Plan.user_id == user_id))
    snapshot = _dumps(plan)
    if row is None:
        db.add(Plan(user_id=user_id, snapshot=snapshot))
    else:
        row.snapshot = snapshot
