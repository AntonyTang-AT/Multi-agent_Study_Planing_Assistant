"""细粒度 knowledge_id ↔ Agent 粗 ID（data/taxonomy/aliases.json）。"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


def _load_aliases(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache
def get_alias_table(aliases_path: str) -> dict[str, Any]:
    return _load_aliases(Path(aliases_path))


def fine_to_agents(fine_id: str, aliases: dict[str, Any]) -> list[str]:
    exact = (aliases.get("exact") or {}).get(fine_id)
    if exact:
        return list(exact)
    best: tuple[int, str] | None = None
    for rule in aliases.get("prefix_rules") or []:
        prefix = rule.get("prefix") or ""
        agent = rule.get("agent")
        if prefix and agent and fine_id.startswith(prefix):
            if best is None or len(prefix) > best[0]:
                best = (len(prefix), agent)
    return [best[1]] if best else []


def question_matches_knowledge_id(
    fine_ids: list[str],
    query_id: str,
    aliases: dict[str, Any],
) -> bool:
    """支持细 ID 精确命中，或粗 ID（如 math.limit）经 aliases 反查。"""
    if not query_id:
        return True
    if query_id in fine_ids:
        return True
    for fine_id in fine_ids:
        if query_id in fine_to_agents(fine_id, aliases):
            return True
        # 也允许用章前缀过滤，如 math.a1.ch02
        if fine_id.startswith(query_id):
            return True
    return False
