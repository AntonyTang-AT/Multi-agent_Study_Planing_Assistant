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
    agent_base_url: str = "http://127.0.0.1:8001"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://1.14.46.251",
    ]
    jwt_secret: str = "zhixu-dev-jwt-secret-change-me"
    jwt_expire_days: int = 7
    materials_root: Path = BACKEND_ROOT.parent / "source" / "_原始下载"
    libreoffice_binary: str = "libreoffice"


@lru_cache
def get_settings() -> Settings:
    return Settings()
