from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Material
from app.db.session import get_db
from app.schemas.content import material_to_dict
from app.services.import_data import resolve_data_root

router = APIRouter(tags=["materials"])

# Agent 粗 ID → 首选资料章（与 aliases.json / 前端 chapters.ts 对齐）
_AGENT_CHAPTER_FALLBACK = {
    "math.limit": "math.a1.ch02",
    "math.derivative": "math.a1.ch04",
    "math.mvt": "math.a1.ch05",
    "math.integral": "math.a1.ch06",
    "math.ode": "math.a1.ch08",
    "phy.mech": "phy.dynamics",
    "phy.wave": "phy.wave",
    "phy.optics": "phy.interference",
    "phy.thermo": "phy.thermo",
}


def _chapter_needles(chapter: str) -> list[str]:
    """细章 / 粗 Agent ID / 中文名均可匹配资料 chapter_id。"""
    raw = (chapter or "").strip()
    if not raw:
        return []
    needles = {raw.lower()}
    primary = _AGENT_CHAPTER_FALLBACK.get(raw)
    if primary:
        needles.add(primary.lower())
    # aliases 反向：同一 agent 下的全部 prefix 也可命中
    try:
        aliases_path: Path = resolve_data_root() / "taxonomy" / "aliases.json"
        data = json.loads(aliases_path.read_text(encoding="utf-8"))
        for rule in data.get("prefix_rules") or []:
            if rule.get("agent") == raw and rule.get("prefix"):
                needles.add(str(rule["prefix"]).lower())
    except (OSError, json.JSONDecodeError, TypeError):
        pass
    return sorted(needles)


@router.get("/api/materials")
def list_materials(
    subject: str | None = Query(default=None, description="学科：math / physics"),
    chapter: str | None = Query(
        default=None, description="章 ID 或章名片段，如 math.a1.ch02 / math.limit"
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
        needles = _chapter_needles(chapter)
        items = [
            m
            for m in items
            if any(
                n in (m.get("chapter_id") or "").lower()
                or n in (m.get("title") or "").lower()
                for n in needles
            )
        ]
    if scenario_tag:
        items = [
            m
            for m in items
            if scenario_tag in (m.get("scenario_tags") or [])
            or scenario_tag in (m.get("tags") or [])
        ]
    return items
