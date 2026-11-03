from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = f"sqlite:///{(BACKEND_ROOT / 'app.db').as_posix()}"
    # 与 agent README / docs/前后端联调接口说明.md 默认端口一致
    agent_base_url: str = "http://127.0.0.1:8001"
    # 前端 VITE_API_BASE 常用 localhost；本地直开也可能是 127.0.0.1
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
