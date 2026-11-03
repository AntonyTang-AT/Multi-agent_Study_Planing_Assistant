from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.db.models import Plan, User
from app.db.session import get_db
from app.errors import AppError
from app.schemas.crud import PlanPutBody, dumps_json, plan_snapshot_from_row

router = APIRouter(tags=["plans"])


@router.get("/api/plans/current")
def get_current_plan(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict[str, Any] | None:
    """无计划时返回 null（200），对齐前端 `Plan | null`。"""
    row = db.scalar(select(Plan).where(Plan.user_id == user.id))
    if row is None:
        return None
    return plan_snapshot_from_row(row)


@router.put("/api/plans/current")
def put_current_plan(
    body: PlanPutBody,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    snapshot = body.to_snapshot_dict()
    if not snapshot:
        raise AppError(
            code="invalid_plan",
            message="计划快照不能为空",
            status_code=400,
        )
    row = db.scalar(select(Plan).where(Plan.user_id == user.id))
    if row is None:
        row = Plan(user_id=user.id, snapshot=dumps_json(snapshot))
        db.add(row)
    else:
        row.snapshot = dumps_json(snapshot)
    db.commit()
    db.refresh(row)
    return plan_snapshot_from_row(row)
