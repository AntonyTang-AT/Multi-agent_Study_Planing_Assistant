"""POST /api/ai/{intent} — 白名单校验后透传 Agent（B4，不落库）。"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse

from app.errors import AppError
from app.services.agent_client import AgentHttpError, AgentUnavailableError, invoke

router = APIRouter(tags=["ai"])

# 对齐 docs/agent-api.md §4 与 frontend AgentIntent
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


@router.post("/api/ai/{intent}")
def ai_invoke(
    intent: str,
    body: dict[str, Any] = Body(default={}),
) -> Any:
    """组装/透传 body → Agent，原样返回。

    禁止在网关写智能分支（自动消冲突、改写答案等）。
    落库留给 B5。
    """
    if intent not in ALLOWED_INTENTS:
        raise AppError(
            code="unknown_intent",
            message=f"不支持的 intent: {intent}",
            status_code=400,
            detail={"supported_intents": sorted(ALLOWED_INTENTS)},
        )

    payload = dict(body) if isinstance(body, dict) else {}
    # 路径 intent 为准，避免客户端 body 与路径不一致
    payload["intent"] = intent

    try:
        return invoke(payload)
    except AgentUnavailableError:
        raise AppError(
            code="agent_unavailable",
            message="智能服务暂不可用",
            status_code=503,
        ) from None
    except AgentHttpError as exc:
        # Agent 可达但业务拒绝：尽量透传错误体，不改写语义
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
