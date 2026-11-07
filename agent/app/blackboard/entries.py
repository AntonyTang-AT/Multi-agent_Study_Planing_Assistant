"""构造黑板条目（持久化由 backend 负责）。"""

from __future__ import annotations

from app.schemas.response import BlackboardEntry


def _thread(*lines: str) -> list[str]:
    return [f"传话 · {line}" for line in lines]


def _merge_evidence(
    evidence_refs: list[str] | None,
    thread: list[str],
) -> list[str]:
    base = list(evidence_refs or [])
    # 已有传话则不重复注入，避免演示刷新叠层
    if any(item.startswith("传话 ·") or item.startswith("传话·") for item in base):
        return base
    return [*thread, *base]


def conflict_entry(
    *,
    entry_id: str,
    summary: str,
    evidence_refs: list[str] | None = None,
    severity: str = "high",
) -> BlackboardEntry:
    thread = _thread(
        "程计：任务时长顶满每日预算，需要用户拍板怎么改。",
        "安节：别直接砍掉，先给压缩 / 顺延 / 加时三个选项。",
        "析因：我会记下这次选择，方便下周避开同类冲突。",
    )
    return BlackboardEntry(
        entry_id=entry_id,
        type="conflict",
        summary=summary,
        severity=severity,
        evidence_refs=_merge_evidence(evidence_refs, thread),
        status="open",
    )


def challenge_entry(
    *,
    entry_id: str,
    summary: str,
    evidence_refs: list[str] | None = None,
    severity: str = "medium",
) -> BlackboardEntry:
    thread = _thread(
        "温题：草稿里好像漏了关键条件，先别让用户提交。",
        "析因：同类错因最近出现过，建议写进黑板。",
        "安节：提醒要温和——指出缺什么，再引导回练习。",
    )
    return BlackboardEntry(
        entry_id=entry_id,
        type="challenge",
        summary=summary,
        severity=severity,
        evidence_refs=_merge_evidence(evidence_refs, thread),
        status="open",
    )


def intervention_entry(
    *,
    entry_id: str,
    summary: str,
    evidence_refs: list[str] | None = None,
    severity: str = "medium",
) -> BlackboardEntry:
    thread = _thread(
        "安节：已经较久没有练习信号，需要短任务把节奏拉回来。",
        "程计：今日目标收成短热身，完成即可。",
        "温题：热身题准备好了，用户点开始就能做。",
    )
    return BlackboardEntry(
        entry_id=entry_id,
        type="intervention",
        summary=summary,
        severity=severity,
        evidence_refs=_merge_evidence(evidence_refs, thread),
        status="open",
    )


def from_error_strategy(
    *,
    entry_id: str,
    blackboard_type: str,
    summary: str,
    evidence_refs: list[str] | None = None,
) -> BlackboardEntry:
    if blackboard_type == "intervention":
        return intervention_entry(
            entry_id=entry_id, summary=summary, evidence_refs=evidence_refs
        )
    if blackboard_type == "challenge":
        return challenge_entry(
            entry_id=entry_id, summary=summary, evidence_refs=evidence_refs
        )
    return conflict_entry(
        entry_id=entry_id, summary=summary, evidence_refs=evidence_refs
    )
