from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Material
from app.db.session import get_db
from app.schemas.content import material_to_dict

router = APIRouter(tags=["materials"])


@router.get("/api/materials")
def list_materials(
    subject: str | None = Query(default=None, description="学科：math / physics"),
    chapter: str | None = Query(
        default=None, description="章 ID 或章名片段，如 math.a1.ch02"
    ),
    scenario_tag: str | None = Query(
        default=None, description="场景/标签过滤（匹配 scenario_tags）"
    ),
    db: Session = Depends(get_db),
) -> list[dict]:
    """返回资料数组（对齐前端 `fetchMaterials` → Material[]）。"""
    stmt = select(Material)
    if subject:
        stmt = stmt.where(Material.subject == subject)
    rows = list(db.scalars(stmt).all())
    items = [material_to_dict(r) for r in rows]

    if chapter:
        needle = chapter.lower()
        items = [
            m
            for m in items
            if needle in (m.get("chapter_id") or "").lower()
            or needle in (m.get("title") or "").lower()
        ]
    if scenario_tag:
        items = [
            m
            for m in items
            if scenario_tag in (m.get("scenario_tags") or [])
            or scenario_tag in (m.get("tags") or [])
        ]
    return items
