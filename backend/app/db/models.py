from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    """会话用户。"""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    demo_time_jump_days: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class KnowledgeNode(Base):
    """大纲知识点（data/taxonomy/*.json）。"""

    __tablename__ = "knowledge_nodes"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    subject: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(256))
    textbook_section: Mapped[str | None] = mapped_column(String(256), nullable=True)
    lecture_weeks: Mapped[str] = mapped_column(Text, default="[]")
    exam_weight: Mapped[int | None] = mapped_column(Integer, nullable=True)
    exam_hot: Mapped[bool] = mapped_column(Boolean, default=False)
    scenario_tags: Mapped[str] = mapped_column(Text, default="[]")
    children: Mapped[str] = mapped_column(Text, default="[]")
    prerequisites: Mapped[str] = mapped_column(Text, default="[]")


class Material(Base):
    """资料元数据（data/materials/index.json · items）。字段对齐前端 Material。"""

    __tablename__ = "materials"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    subject: Mapped[str] = mapped_column(String(64), index=True)
    chapter_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    kind: Mapped[str] = mapped_column(String(64), default="textbook")
    title: Mapped[str] = mapped_column(String(512))
    file: Mapped[str | None] = mapped_column(String(512), nullable=True)
    page_range: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON [start,end]
    page_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    license_note: Mapped[str] = mapped_column(String(512), default="")
    status: Mapped[str] = mapped_column(String(64), default="downloaded")
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    knowledge_ids: Mapped[str] = mapped_column(Text, default="[]")
    scenario_tags: Mapped[str] = mapped_column(Text, default="[]")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)


class Question(Base):
    """习题（data/questions/*.json）。"""

    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    subject: Mapped[str] = mapped_column(String(64), index=True)
    knowledge_ids: Mapped[str] = mapped_column(Text, default="[]")
    scenario_tags: Mapped[str] = mapped_column(Text, default="[]")
    chapter: Mapped[str | None] = mapped_column(String(256), nullable=True, index=True)
    lecture_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    exam_hot: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    difficulty: Mapped[int | None] = mapped_column(Integer, nullable=True)
    type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    stem: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    assumptions: Mapped[str] = mapped_column(Text, default="[]")
    error_tags: Mapped[str] = mapped_column(Text, default="[]")
    verify_hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(String(256), nullable=True)
    license_note: Mapped[str | None] = mapped_column(String(256), nullable=True)


class Plan(Base):
    """用户当前计划快照（JSON，对齐前端 Plan / agent output.plan）。"""

    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    snapshot: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Attempt(Base):
    """作答记录。"""

    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    question_id: Mapped[str] = mapped_column(String(128), index=True)
    answer: Mapped[str] = mapped_column(Text)
    error_tag: Mapped[str | None] = mapped_column(String(128), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class BlackboardEntry(Base):
    """黑板条目（B5 AI 落库写入；B3 提供 GET + resolve）。"""

    __tablename__ = "blackboard_entries"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    type: Mapped[str] = mapped_column(String(64), default="conflict")
    summary: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(32), default="medium")
    evidence_refs: Mapped[str] = mapped_column(Text, default="[]")
    status: Mapped[str] = mapped_column(String(32), default="open", index=True)
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AiCallLog(Base):
    """AI 网关调用全量快照（请求/响应 JSON；可追溯）。"""

    __tablename__ = "ai_call_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    intent: Mapped[str] = mapped_column(String(64), index=True)
    request_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    task_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    request_body: Mapped[str] = mapped_column(Text, default="{}")
    response_body: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
