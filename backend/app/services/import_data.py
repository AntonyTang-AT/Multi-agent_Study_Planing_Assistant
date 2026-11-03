"""从 data/ 导入 taxonomy / materials / questions（幂等 upsert）。"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import KnowledgeNode, Material, Question

logger = logging.getLogger(__name__)

# backend/app/services → repo root
REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DATA_ROOT = REPO_ROOT / "data"


def _dumps(value: Any) -> str:
    return json.dumps(value if value is not None else [], ensure_ascii=False)


def _dumps_optional(value: Any) -> str | None:
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False)


def resolve_data_root(data_root: Path | str | None = None) -> Path:
    root = Path(data_root) if data_root else DEFAULT_DATA_ROOT
    return root.resolve()


def _upsert_knowledge_node(db: Session, subject: str, node: dict[str, Any]) -> None:
    node_id = node["id"]
    existing = db.get(KnowledgeNode, node_id)
    fields = {
        "subject": subject,
        "name": node.get("name") or node_id,
        "textbook_section": node.get("textbook_section"),
        "lecture_weeks": _dumps(node.get("lecture_weeks") or []),
        "exam_weight": node.get("exam_weight"),
        "exam_hot": bool(node.get("exam_hot", False)),
        "scenario_tags": _dumps(node.get("scenario_tags") or []),
        "children": _dumps(node.get("children") or []),
        "prerequisites": _dumps(node.get("prerequisites") or []),
    }
    if existing is None:
        db.add(KnowledgeNode(id=node_id, **fields))
    else:
        for key, value in fields.items():
            setattr(existing, key, value)


def _upsert_material(db: Session, item: dict[str, Any]) -> None:
    material_id = item.get("material_id") or item.get("id")
    if not material_id:
        raise ValueError("material missing material_id")

    chapter_id = item.get("chapter_id") or item.get("chapter")
    knowledge_ids = item.get("knowledge_ids")
    if not knowledge_ids and chapter_id:
        knowledge_ids = [chapter_id]

    fields = {
        "subject": item.get("subject") or "",
        "chapter_id": chapter_id,
        "kind": item.get("kind") or "textbook",
        "title": item.get("title") or material_id,
        "file": item.get("file"),
        "page_range": _dumps_optional(item.get("page_range")),
        "page_status": item.get("page_status"),
        "license_note": item.get("license_note") or "",
        "status": item.get("status") or "downloaded",
        "note": item.get("note"),
        "knowledge_ids": _dumps(knowledge_ids or []),
        "scenario_tags": _dumps(item.get("scenario_tags") or []),
        "summary": item.get("summary") or item.get("title"),
    }
    existing = db.get(Material, material_id)
    if existing is None:
        db.add(Material(id=material_id, **fields))
    else:
        for key, value in fields.items():
            setattr(existing, key, value)


def _upsert_question(db: Session, item: dict[str, Any]) -> None:
    qid = item.get("question_id") or item.get("id")
    if not qid:
        raise ValueError("question missing question_id")
    fields = {
        "subject": item.get("subject") or "",
        "knowledge_ids": _dumps(item.get("knowledge_ids") or []),
        "scenario_tags": _dumps(item.get("scenario_tags") or []),
        "chapter": item.get("chapter"),
        "lecture_week": item.get("lecture_week"),
        "exam_hot": bool(item.get("exam_hot", False)),
        "difficulty": item.get("difficulty"),
        "type": item.get("type"),
        "stem": item.get("stem") or "",
        "answer": item.get("answer") if item.get("answer") is not None else "",
        "assumptions": _dumps(item.get("assumptions") or []),
        "error_tags": _dumps(item.get("error_tags") or []),
        "verify_hint": _dumps_optional(item.get("verify_hint")),
        "source": item.get("source"),
        "license_note": item.get("license_note"),
    }
    existing = db.get(Question, qid)
    if existing is None:
        db.add(Question(id=qid, **fields))
    else:
        for key, value in fields.items():
            setattr(existing, key, value)


def import_taxonomy(db: Session, data_root: Path) -> int:
    taxonomy_dir = data_root / "taxonomy"
    count = 0
    if not taxonomy_dir.is_dir():
        return 0
    for path in sorted(taxonomy_dir.glob("*_outline.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        subject = data.get("subject") or path.stem
        for node in data.get("nodes") or []:
            if "id" not in node:
                continue
            _upsert_knowledge_node(db, subject, node)
            count += 1
    return count


def import_materials(db: Session, data_root: Path) -> int:
    """兼容 materials/index.json（顶层 items）与 materials/*.json（materials 数组）。"""
    materials_dir = data_root / "materials"
    count = 0
    if not materials_dir.is_dir():
        return 0

    index_path = materials_dir / "index.json"
    paths = [index_path] if index_path.is_file() else []
    paths.extend(
        p for p in sorted(materials_dir.glob("*.json")) if p.name != "index.json"
    )

    for path in paths:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            items = data.get("items") or data.get("materials") or []
        else:
            items = data
        if not isinstance(items, list):
            continue
        for item in items:
            _upsert_material(db, item)
            count += 1
    return count


def import_questions(db: Session, data_root: Path) -> int:
    questions_dir = data_root / "questions"
    count = 0
    if not questions_dir.is_dir():
        return 0
    for path in sorted(questions_dir.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        items = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(items, list):
            continue
        for item in items:
            _upsert_question(db, item)
            count += 1
    return count


def import_all(db: Session, data_root: Path | str | None = None) -> dict[str, int]:
    root = resolve_data_root(data_root)
    stats = {
        "knowledge_nodes": import_taxonomy(db, root),
        "materials": import_materials(db, root),
        "questions": import_questions(db, root),
    }
    db.commit()
    logger.info("import_all from %s → %s", root, stats)
    return stats


def db_has_content(db: Session) -> bool:
    kn = db.scalar(select(func.count()).select_from(KnowledgeNode)) or 0
    mat = db.scalar(select(func.count()).select_from(Material)) or 0
    q = db.scalar(select(func.count()).select_from(Question)) or 0
    return (kn + mat + q) > 0


def seed_if_empty(db: Session, data_root: Path | str | None = None) -> dict[str, int] | None:
    if db_has_content(db):
        logger.info("seed_if_empty: db already has content, skip")
        return None
    return import_all(db, data_root)
