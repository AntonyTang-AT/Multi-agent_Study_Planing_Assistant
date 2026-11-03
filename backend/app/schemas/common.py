from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """对齐 docs/api.md 与 frontend HealthResponse。"""

    db: Literal["up", "down"]
    agent: Literal["up", "down"]


class SessionResponse(BaseModel):
    """对齐 docs/api.md 与 frontend SessionResponse。"""

    user_id: str = Field(..., description="新建会话用户 ID")


class ErrorBody(BaseModel):
    code: str
    message: str
    detail: object | None = None
