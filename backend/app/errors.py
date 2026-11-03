from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """统一业务错误，响应对齐 docs/api.md 与前端 ApiErrorResponse。"""

    def __init__(
        self,
        *,
        code: str,
        message: str,
        status_code: int = 400,
        detail: Any = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    body: dict[str, Any] = {"code": exc.code, "message": exc.message}
    if exc.detail is not None:
        body["detail"] = exc.detail
    return JSONResponse(status_code=exc.status_code, content=body)


async def http_exception_handler(_request: Request, exc: Any) -> JSONResponse:
    detail = getattr(exc, "detail", "error")
    if isinstance(detail, dict) and "code" in detail and "message" in detail:
        return JSONResponse(status_code=exc.status_code, content=detail)
    return JSONResponse(
        status_code=getattr(exc, "status_code", 500),
        content={"code": "http_error", "message": str(detail)},
    )
