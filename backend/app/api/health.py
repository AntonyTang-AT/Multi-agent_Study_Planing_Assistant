from __future__ import annotations

from fastapi import APIRouter

from app.db.session import db_ping
from app.schemas.common import HealthResponse
from app.services.agent_client import probe_health

router = APIRouter(tags=["health"])


@router.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        db="up" if db_ping() else "down",
        agent=probe_health(),
    )
