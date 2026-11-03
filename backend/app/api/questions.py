from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Question
from app.db.session import get_db
from app.schemas.content import question_to_dict
from app.services.aliases import get_alias_table, question_matches_knowledge_id
from app.services.import_data import resolve_data_root

router = APIRouter(tags=["questions"])


@router.get("/api/questions")
def list_questions(
    subject: str | None = Query(default=None, description="学科：math / physics"),
    knowledge_id: str | None = Query(
        default=None,
        description="知识点：细 ID 或 Agent 粗 ID（如 math.limit，经 aliases 映射）",
    ),
    scenario_tag: str | None = Query(
        default=None, description="场景标签：final_review / catch_up"
    ),
    exam_hot: bool | None = Query(default=None, description="是否期末高频题"),
    db: Session = Depends(get_db),
) -> list[dict]:
    """返回题目数组（对齐前端 `fetchQuestions` → Question[]）。"""
    stmt = select(Question)
    if subject:
        stmt = stmt.where(Question.subject == subject)
    if exam_hot is not None:
        stmt = stmt.where(Question.exam_hot.is_(exam_hot))
    rows = list(db.scalars(stmt).all())
    items = [question_to_dict(r) for r in rows]

    if scenario_tag:
        items = [q for q in items if scenario_tag in (q.get("scenario_tags") or [])]

    if knowledge_id:
        aliases_path = resolve_data_root() / "taxonomy" / "aliases.json"
        aliases = get_alias_table(str(aliases_path))
        items = [
            q
            for q in items
            if question_matches_knowledge_id(
                list(q.get("knowledge_ids") or []),
                knowledge_id,
                aliases,
            )
        ]
    return items
