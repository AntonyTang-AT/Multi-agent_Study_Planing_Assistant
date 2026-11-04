"""资料 / 题目 API 序列化 — 对齐 frontend/src/types/api.ts。"""

from __future__ import annotations

import json
from typing import Any

from app.db.models import Material, Question
from app.services.material_files import file_status


def _loads(raw: str | None, default: Any = None) -> Any:
    if raw is None or raw == "":
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def material_to_dict(row: Material) -> dict[str, Any]:
    page_range = _loads(row.page_range, None)
    return {
        "material_id": row.id,
        **file_status(row.file),
        "subject": row.subject,
        "chapter_id": row.chapter_id or "",
        "kind": row.kind,
        "title": row.title,
        "file": row.file,
        "page_range": page_range,
        "page_status": row.page_status,
        "license_note": row.license_note or "",
        "status": row.status or "downloaded",
        "note": row.note,
        # 扩展字段：前端 MaterialsPage 可选读取
        "knowledge_ids": _loads(row.knowledge_ids, []),
        "scenario_tags": _loads(row.scenario_tags, []),
        "summary": row.summary or row.title,
        "tags": _loads(row.scenario_tags, []),
    }


def question_to_dict(row: Question) -> dict[str, Any]:
    return {
        "question_id": row.id,
        "subject": row.subject,
        "knowledge_ids": _loads(row.knowledge_ids, []),
        "scenario_tags": _loads(row.scenario_tags, []),
        "chapter": row.chapter or "",
        "lecture_week": row.lecture_week,
        "exam_hot": bool(row.exam_hot),
        "difficulty": row.difficulty if row.difficulty is not None else 1,
        "type": row.type or "fill",
        "stem": row.stem,
        "answer": row.answer,
        "assumptions": _loads(row.assumptions, []),
        "error_tags": _loads(row.error_tags, []),
        "verify_hint": _loads(row.verify_hint, None),
        "source": row.source or "",
        "license_note": row.license_note or "",
    }
