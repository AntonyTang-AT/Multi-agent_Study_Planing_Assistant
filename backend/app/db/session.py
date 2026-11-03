from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings
from app.db.models import Base

_settings = get_settings()
engine = create_engine(
    _settings.database_url,
    connect_args={"check_same_thread": False}
    if _settings.database_url.startswith("sqlite")
    else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

_TABLE_COLUMN_DDL: dict[str, dict[str, str]] = {
    "users": {
        "demo_time_jump_days": "INTEGER NOT NULL DEFAULT 0",
        "username": "VARCHAR(64)",
        "password_hash": "VARCHAR(255)",
        "display_name": "VARCHAR(128)",
        "role": "VARCHAR(32) NOT NULL DEFAULT 'student'",
    },
    "attempts": {
        "is_correct": "BOOLEAN",
    },
}


def _sqlite_add_missing_columns() -> None:
    """轻量补列：旧 SQLite 上 create_all 不会 ALTER 已有表。"""
    if not _settings.database_url.startswith("sqlite"):
        return
    insp = inspect(engine)
    with engine.begin() as conn:
        for table, columns in _TABLE_COLUMN_DDL.items():
            if table not in insp.get_table_names():
                continue
            cols = {c["name"] for c in insp.get_columns(table)}
            for name, ddl in columns.items():
                if name not in cols:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _sqlite_add_missing_columns()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def db_ping() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
