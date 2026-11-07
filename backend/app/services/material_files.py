"""Resolve registered originals inside a configured root; preview Office files as PDF.

Large PDFs are preferably handed off to nginx via X-Accel-Redirect so uvicorn
does not stream tens of megabytes through Python (the main preview bottleneck).
"""
from __future__ import annotations

import hashlib
import shutil
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import quote

from fastapi.responses import FileResponse, Response
from starlette.background import BackgroundTask

from app.config import get_settings
from app.errors import AppError

OFFICE_TYPES = {".ppt", ".pptx", ".doc", ".docx"}
CACHE_HEADERS = {
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
}


def resolve_material_file(file: str | None) -> Path | None:
    root = get_settings().materials_root.resolve()
    if not file or "\\" in file or Path(file).is_absolute():
        return None
    path = (root / file).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        return None
    return path


def file_status(file: str | None) -> dict:
    path = resolve_material_file(file)
    available = path is not None
    previewable = bool(path and (path.suffix.lower() == ".pdf" or (
        path.suffix.lower() in OFFICE_TYPES and shutil.which(get_settings().libreoffice_binary)
    )))
    size = path.stat().st_size if path else 0
    return {
        "available": available,
        "preview_available": previewable,
        "size_bytes": size,
    }


def _preview_cache_dir() -> Path:
    root = get_settings().materials_root.resolve()
    cache = root / ".preview_cache"
    cache.mkdir(parents=True, exist_ok=True)
    return cache


def _cache_key(path: Path) -> str:
    stat = path.stat()
    raw = f"{path.resolve()}|{stat.st_mtime_ns}|{stat.st_size}".encode("utf-8", "ignore")
    return hashlib.sha1(raw).hexdigest()


def _content_disposition(filename: str, *, inline: bool) -> str:
    # HTTP headers must be latin-1; 中文文件名用 RFC5987 filename*
    ascii_name = filename.encode("ascii", "ignore").decode("ascii") or "file.bin"
    encoded = quote(filename)
    kind = "inline" if inline else "attachment"
    return f"{kind}; filename=\"{ascii_name}\"; filename*=UTF-8''{encoded}"


def _accel_response(path: Path, *, filename: str, inline: bool) -> Response | None:
    """If nginx X-Accel is configured, hand the file to nginx sendfile."""
    prefix = (get_settings().materials_x_accel_prefix or "").strip()
    if not prefix:
        return None
    root = get_settings().materials_root.resolve()
    try:
        rel = path.resolve().relative_to(root).as_posix()
    except ValueError:
        return None
    if not prefix.endswith("/"):
        prefix += "/"
    # Encode path segments but keep slashes for nginx alias（中文必须 percent-encode）
    encoded = quote(rel, safe="/")
    media = (
        "application/pdf"
        if inline or path.suffix.lower() == ".pdf"
        else "application/octet-stream"
    )
    headers = {
        "X-Accel-Redirect": prefix + encoded,
        "Content-Type": media,
        "Content-Disposition": _content_disposition(filename, inline=inline),
        **CACHE_HEADERS,
    }
    return Response(content=b"", status_code=200, headers=headers)


def _pdf_response(path: Path, *, filename: str) -> Response:
    accel = _accel_response(path, filename=filename, inline=True)
    if accel is not None:
        return accel
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=filename,
        content_disposition_type="inline",
        headers=dict(CACHE_HEADERS),
    )


def material_response(file: str | None, *, preview: bool = False):
    path = resolve_material_file(file)
    if path is None:
        raise AppError(code="material_file_missing", message="原始资料尚未部署，请联系管理员补充文件", status_code=404)
    if not preview:
        accel = _accel_response(path, filename=path.name, inline=False)
        if accel is not None:
            return accel
        return FileResponse(
            path,
            filename=path.name,
            headers=dict(CACHE_HEADERS),
        )
    if path.suffix.lower() == ".pdf":
        return _pdf_response(path, filename=path.name)
    if path.suffix.lower() not in OFFICE_TYPES:
        raise AppError(code="preview_unsupported", message="该格式暂不支持预览，请下载原件", status_code=415)
    binary = shutil.which(get_settings().libreoffice_binary)
    if not binary:
        raise AppError(code="preview_unavailable", message="预览服务未安装，请下载原件", status_code=503)

    cached = _preview_cache_dir() / f"{_cache_key(path)}.pdf"
    if cached.is_file() and cached.stat().st_size > 0:
        return _pdf_response(cached, filename=path.stem + ".pdf")

    temp = TemporaryDirectory(prefix="zhixu-preview-")
    work = Path(temp.name)
    try:
        source = work / ("source" + path.suffix.lower())
        shutil.copyfile(path, source)
        subprocess.run([
            binary, "-env:UserInstallation=" + (work / "profile").as_uri(),
            "--headless", "--convert-to", "pdf", "--outdir", str(work), str(source),
        ], check=True, timeout=60, capture_output=True)
        output = work / "source.pdf"
        if not output.is_file():
            raise OSError("converter produced no PDF")
        shutil.copyfile(output, cached)
        temp.cleanup()
        return _pdf_response(cached, filename=path.stem + ".pdf")
    except (OSError, subprocess.SubprocessError):
        temp.cleanup()
        if cached.exists():
            cached.unlink(missing_ok=True)
        raise AppError(code="preview_failed", message="资料转换失败，请下载原件", status_code=503) from None
