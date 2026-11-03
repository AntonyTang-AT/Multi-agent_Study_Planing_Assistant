"""POST /api/ai/{intent} — 白名单透传 Agent；成功后落库（B5）。"""

from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, Header
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.deps import get_or_create_demo_user
from app.db.models import User
from app.db.session import get_db
from app.errors import AppError
from app.services.agent_client import AgentHttpError, AgentUnavailableError, invoke
from app.services.ai_persist import persist_ai_success

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ai"])

ALLOWED_INTENTS: frozenset[str] = frozenset(
    {
        "create_plan",
        "arbitrate",
        "generate_question",
        "verify_answer",
        "record_trace",
        "challenge",
        "metacognitive_feedback",
        "proactive_intervention",
        "echo",
    }
)


def _resolve_user(db: Session, x_user_id: str | None) -> User:
    if x_user_id and x_user_id.strip():
        user = db.get(User, x_user_id.strip())
        if user is not None:
            return user
    return get_or_create_demo_user(db)


def _inject_demo_time_jump(payload: dict[str, Any], user: User) -> None:
    """将会话演示偏移注入 payload.demo.time_jump_days（不覆盖已显式正值）。"""
    jump = int(getattr(user, "demo_time_jump_days", 0) or 0)
    if jump <= 0:
        return
    demo = payload.get("demo")
    if not isinstance(demo, dict):
        demo = {}
        payload["demo"] = demo
    existing = demo.get("time_jump_days")
    try:
        existing_n = int(existing) if existing is not None else 0
    except (TypeError, ValueError):
        existing_n = 0
    if existing_n <= 0:
        demo["time_jump_days"] = jump


@router.post("/api/ai/{intent}")
def ai_invoke(
    intent: str,
    body: dict[str, Any] = Body(default={}),
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
    db: Session = Depends(get_db),
) -> Any:
    """透传 Agent；2xx 成功后写 AiCallLog / 黑板 / 计划草稿。禁止智能分支。"""
    if intent not in ALLOWED_INTENTS:
        raise AppError(
            code="unknown_intent",
            message=f"不支持的 intent: {intent}",
            status_code=400,
            detail={"supported_intents": sorted(ALLOWED_INTENTS)},
        )

    payload = dict(body) if isinstance(body, dict) else {}
    payload["intent"] = intent

    user = _resolve_user(db, x_user_id)
    _inject_demo_time_jump(payload, user)

    try:
        result = invoke(payload)
    except AgentUnavailableError:
        raise AppError(
            code="agent_unavailable",
            message="智能服务暂不可用",
            status_code=503,
        ) from None
    except AgentHttpError as exc:
        body_out = exc.body
        if isinstance(body_out, dict):
            detail = body_out.get("detail", body_out)
            if isinstance(detail, dict) and "code" in detail and "message" in detail:
                return JSONResponse(status_code=exc.status_code, content=detail)
            if "code" in body_out and "message" in body_out:
                return JSONResponse(status_code=exc.status_code, content=body_out)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": "agent_error",
                "message": "Agent 返回错误",
                "detail": body_out,
            },
        )

    if isinstance(result, dict):
        try:
            persist_ai_success(
                db,
                user_id=user.id,
                intent=intent,
                request_payload=payload,
                response=result,
            )
            db.commit()
        except Exception:
            db.rollback()
            logger.exception(
                "AI persist failed intent=%s user=%s", intent, user.id
            )

    return result
