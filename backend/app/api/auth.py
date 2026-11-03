"""认证：注册 / 登录 / 改密 / me。"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.db.models import User
from app.db.session import get_db
from app.errors import AppError
from app.services.security import (
    create_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(tags=["auth"])


class RegisterBody(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=6, max_length=128)
    display_name: str | None = Field(default=None, max_length=128)


class LoginBody(BaseModel):
    username: str
    password: str


class ChangePasswordBody(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=128)


def _public_user(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name or user.username or user.id,
        "role": user.role or "student",
    }


@router.post("/api/auth/register")
def register(body: RegisterBody, db: Session = Depends(get_db)) -> dict[str, Any]:
    username = body.username.strip()
    if not username:
        raise AppError(code="invalid_username", message="用户名不能为空", status_code=400)
    exists = db.scalar(select(User).where(User.username == username))
    if exists is not None:
        raise AppError(code="username_taken", message="用户名已被占用", status_code=409)

    user = User(
        username=username,
        password_hash=hash_password(body.password),
        display_name=(body.display_name or username).strip(),
        role="student",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(
        user_id=user.id, role=user.role, username=user.username
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _public_user(user),
    }


@router.post("/api/auth/login")
def login(body: LoginBody, db: Session = Depends(get_db)) -> dict[str, Any]:
    username = body.username.strip()
    user = db.scalar(select(User).where(User.username == username))
    if user is None or not verify_password(body.password, user.password_hash):
        raise AppError(
            code="invalid_credentials",
            message="用户名或密码错误",
            status_code=401,
        )
    token = create_access_token(
        user_id=user.id, role=user.role or "student", username=user.username
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _public_user(user),
    }


@router.get("/api/auth/me")
def me(user: User = Depends(require_user)) -> dict[str, Any]:
    return _public_user(user)


@router.post("/api/auth/change-password")
def change_password(
    body: ChangePasswordBody,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if not user.password_hash:
        raise AppError(
            code="password_not_set",
            message="当前用户未设置密码，无法改密",
            status_code=400,
        )
    if not verify_password(body.old_password, user.password_hash):
        raise AppError(
            code="invalid_credentials",
            message="原密码不正确",
            status_code=400,
        )
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "密码已更新"}
