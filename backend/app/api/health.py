from __future__ import annotations

from typing import Literal

import httpx
from fastapi import APIRouter

from app.config import get_settings
from app.db.session import db_ping
from app.schemas.common import HealthResponse

router = APIRouter(tags=["health"])


def _agent_status() -> Literal["up", "down"]:
    """探测 Agent GET /health（见 docs/前后端联调接口说明.md §3.1）。"""
    base = get_settings().agent_base_url.rstrip("/")
    try:
        with httpx.Client(timeout=2.0, trust_env=False) as client:
            resp = client.get(f"{base}/health")
            if resp.status_code == 200:
                return "up"
    except httpx.HTTPError:
        pass
    return "down"


@router.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        db="up" if db_ping() else "down",
        agent=_agent_status(),
    )
