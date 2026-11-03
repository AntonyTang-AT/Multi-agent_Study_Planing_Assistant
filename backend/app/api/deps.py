"""请求依赖：会话用户（X-User-Id，可回退演示用户）。"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.session import get_db
from app.errors import AppError

# 前端 Mock / Agent 请求里固定使用；当前前端尚未统一写入请求头时回退此用户
DEMO_USER_ID = "u_web_demo"


def get_or_create_demo_user(db: Session) -> User:
    user = db.get(User, DEMO_USER_ID)
    if user is None:
        user = User(id=DEMO_USER_ID)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def require_user(
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
    db: Session = Depends(get_db),
) -> User:
    """优先使用 X-User-Id；缺省时回退 u_web_demo，保证 F3 无头也能联调。"""
    if x_user_id and x_user_id.strip():
        user = db.get(User, x_user_id.strip())
        if user is None:
            raise AppError(
                code="user_not_found",
                message="用户不存在，请先 POST /api/session",
                status_code=401,
            )
        return user
    return get_or_create_demo_user(db)
