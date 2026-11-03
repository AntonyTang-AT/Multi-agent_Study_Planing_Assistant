from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api import health, session
from app.config import get_settings
from app.db.session import init_db
from app.errors import AppError, app_error_handler, http_exception_handler


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="知序学习助手 · Backend",
        version="0.1.0-b1",
        description=(
            "传统 Web API 骨架（B1）。"
            "前端只请求本服务；Agent 仅经后续网关转发，本服务不持有 LLM Key。"
        ),
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.include_router(health.router)
    app.include_router(session.router)
    return app


app = create_app()
