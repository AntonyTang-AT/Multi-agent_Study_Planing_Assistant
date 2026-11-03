from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.session import get_db
from app.schemas.common import SessionResponse

router = APIRouter(tags=["session"])


@router.post("/api/session", response_model=SessionResponse)
def create_session(db: Session = Depends(get_db)) -> SessionResponse:
    """前端 AppLayout 启动时调用 createSession() → POST /api/session。"""
    user = User()
    db.add(user)
    db.commit()
    db.refresh(user)
    return SessionResponse(user_id=user.id)
