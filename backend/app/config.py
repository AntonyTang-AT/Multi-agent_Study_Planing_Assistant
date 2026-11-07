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
    # 非空时预览/下载走 nginx X-Accel（例：/_materials/），避开 uvicorn 传大文件
    materials_x_accel_prefix: str = ""


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    # 相对路径按 backend/ 解析，避免启动 cwd 不同导致 MATERIALS_ROOT 找不到
    if not settings.materials_root.is_absolute():
        settings.materials_root = (BACKEND_ROOT / settings.materials_root).resolve()
    return settings
