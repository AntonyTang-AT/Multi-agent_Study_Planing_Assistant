from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.db.models import BlackboardEntry, User
from app.db.session import get_db
from app.errors import AppError
from app.schemas.crud import BlackboardResolveBody, blackboard_to_dict, dumps_json

router = APIRouter(tags=["blackboard"])


@router.get("/api/blackboard")
def list_blackboard(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """返回条目数组，对齐前端 `fetchBlackboard` → BlackboardEntry[]。"""
    rows = list(
        db.scalars(
            select(BlackboardEntry)
            .where(BlackboardEntry.user_id == user.id)
            .order_by(BlackboardEntry.created_at.desc())
        ).all()
    )
    return [blackboard_to_dict(r) for r in rows]


@router.post("/api/blackboard/{entry_id}/resolve")
def resolve_blackboard(
    entry_id: str,
    body: BlackboardResolveBody,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """仅更新 status/resolution，不做智能消冲突。"""
    if not body.action.strip():
        raise AppError(
            code="invalid_resolve",
            message="action 不能为空",
            status_code=400,
        )
    row = db.get(BlackboardEntry, entry_id)
    if row is None or row.user_id != user.id:
        raise AppError(
            code="blackboard_not_found",
            message="黑板条目不存在",
            status_code=404,
        )
    row.status = "resolved"
    row.resolution = dumps_json(
        {"action": body.action.strip(), "note": body.note}
    )
    db.commit()
    db.refresh(row)
    return blackboard_to_dict(row)
