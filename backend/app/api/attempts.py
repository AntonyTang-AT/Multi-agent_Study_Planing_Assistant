from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.db.models import Attempt, User
from app.db.session import get_db
from app.errors import AppError
from app.schemas.crud import AttemptCreateBody, attempt_to_dict

router = APIRouter(tags=["attempts"])


@router.post("/api/attempts")
def create_attempt(
    body: AttemptCreateBody,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if not body.question_id.strip():
        raise AppError(
            code="invalid_attempt",
            message="question_id 不能为空",
            status_code=400,
        )
    row = Attempt(
        user_id=user.id,
        question_id=body.question_id.strip(),
        answer=body.answer,
        error_tag=body.error_tag,
        duration_ms=body.duration_ms,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return attempt_to_dict(row)
