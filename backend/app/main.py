from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api import (
    ai_gateway,
    attempts,
    blackboard,
    health,
    materials,
    plans,
    questions,
    session,
)
from app.config import get_settings
from app.db.session import SessionLocal, init_db
from app.errors import AppError, app_error_handler, http_exception_handler
from app.services.import_data import seed_if_empty

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    with SessionLocal() as db:
        stats = seed_if_empty(db)
        if stats:
            logger.info("startup seed: %s", stats)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="知序学习助手 · Backend",
        version="0.4.0-b4",
        description=(
            "传统 Web API（B4）。"
            "前端只请求本服务；AI 经网关透传 Agent，本服务不持有 LLM Key、不写智能分支。"
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
    app.include_router(materials.router)
    app.include_router(questions.router)
    app.include_router(plans.router)
    app.include_router(attempts.router)
    app.include_router(blackboard.router)
    app.include_router(ai_gateway.router)
    return app


app = create_app()
