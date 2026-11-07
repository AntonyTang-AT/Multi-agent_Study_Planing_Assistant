"""演示辅助：时间跳跃、恢复预设种子。只改数据/时钟，不写智能。"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.db.models import User
from app.db.session import get_db
from app.errors import AppError

router = APIRouter(tags=["demo"])


class TimeJumpBody(BaseModel):
    days: int = Field(..., description="演示时间跳跃天数（写入会话，供 AI 网关注入）")


@router.post("/api/demo/time-jump")
def time_jump(
    body: TimeJumpBody,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """更新当前会话的演示时间偏移；后续 POST /api/ai/* 注入 demo.time_jump_days。

    不做智能：不调用 Agent、不改计划/黑板。
    """
    if body.days < 0:
        raise AppError(
            code="invalid_time_jump",
            message="days 不能为负数",
            status_code=400,
        )
    user.demo_time_jump_days = int(body.days)
    db.commit()
    db.refresh(user)
    return {
        "user_id": user.id,
        "time_jump_days": user.demo_time_jump_days,
        "message": "演示时钟偏移已更新；下次 AI 调用将带上 demo.time_jump_days",
    }


@router.post("/api/demo/reset")
def reset_preset(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """把当前演示账号恢复到开场预设（计划/黑板/作答），不清空账号本身。"""
    from scripts.seed_demo_accounts import reseed_focus_user

    ok = reseed_focus_user(db, user.id)
    if not ok:
        raise AppError(
            code="not_demo_account",
            message="当前账号不是演示预设账号，无法一键恢复开场数据",
            status_code=400,
        )
    db.commit()
    return {
        "ok": True,
        "user_id": user.id,
        "message": "已恢复为开场预设学习数据（非清空账号）",
    }
