"""请求依赖：JWT 优先，兼容过渡期 X-User-Id；缺省回退演示用户。"""

from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.session import get_db
from app.errors import AppError
from app.services.security import decode_access_token

DEMO_USER_ID = "u_web_demo"


def get_or_create_demo_user(db: Session) -> User:
    user = db.get(User, DEMO_USER_ID)
    if user is None:
        user = User(
            id=DEMO_USER_ID,
            username="u_web_demo",
            display_name="Web Demo",
            role="student",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def _user_from_bearer(db: Session, authorization: str | None) -> User | None:
    if not authorization:
        return None
    parts = authorization.strip().split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1].strip()
    if not token:
        return None
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError:
        raise AppError(
            code="invalid_token",
            message="登录已失效，请重新登录",
            status_code=401,
        ) from None
    user_id = payload.get("sub")
    if not user_id:
        raise AppError(
            code="invalid_token",
            message="无效的登录凭证",
            status_code=401,
        )
    user = db.get(User, str(user_id))
    if user is None:
        raise AppError(
            code="user_not_found",
            message="用户不存在，请重新登录",
            status_code=401,
        )
    return user


def require_user(
    authorization: Annotated[str | None, Header()] = None,
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
    db: Session = Depends(get_db),
) -> User:
    """优先 Bearer JWT；其次已存在的 X-User-Id；最后回退 u_web_demo。"""
    bearer_user = _user_from_bearer(db, authorization)
    if bearer_user is not None:
        return bearer_user

    if x_user_id and x_user_id.strip():
        user = db.get(User, x_user_id.strip())
        if user is None:
            raise AppError(
                code="user_not_found",
                message="用户不存在，请先登录",
                status_code=401,
            )
        return user

    return get_or_create_demo_user(db)


def require_admin(user: User = Depends(require_user)) -> User:
    if (user.role or "") != "admin":
        raise AppError(
            code="forbidden",
            message="需要管理员权限",
            status_code=403,
        )
    return user
