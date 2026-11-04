"""Resolve registered originals inside a configured root; preview Office files as PDF."""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from app.config import get_settings
from app.errors import AppError

OFFICE_TYPES = {".ppt", ".pptx", ".doc", ".docx"}


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
    return {"available": available, "preview_available": previewable}


def material_response(file: str | None, *, preview: bool = False):
    path = resolve_material_file(file)
    if path is None:
        raise AppError(code="material_file_missing", message="原始资料尚未部署，请联系管理员补充文件", status_code=404)
    if not preview:
        return FileResponse(path, filename=path.name)
    if path.suffix.lower() == ".pdf":
        return FileResponse(path, media_type="application/pdf", filename=path.name, content_disposition_type="inline")
    if path.suffix.lower() not in OFFICE_TYPES:
        raise AppError(code="preview_unsupported", message="该格式暂不支持预览，请下载原件", status_code=415)
    binary = shutil.which(get_settings().libreoffice_binary)
    if not binary:
        raise AppError(code="preview_unavailable", message="预览服务未安装，请下载原件", status_code=503)
    temp = TemporaryDirectory(prefix="zhixu-preview-")
    work = Path(temp.name)
    try:
        # Isolated input and user profile prevent cross-request output/profile races.
        source = work / ("source" + path.suffix.lower())
        shutil.copyfile(path, source)
        subprocess.run([
            binary, "-env:UserInstallation=" + (work / "profile").as_uri(),
            "--headless", "--convert-to", "pdf", "--outdir", str(work), str(source),
        ], check=True, timeout=60, capture_output=True)
        output = work / "source.pdf"
        if not output.is_file():
            raise OSError("converter produced no PDF")
        return FileResponse(output, media_type="application/pdf", filename=path.stem + ".pdf",
                            content_disposition_type="inline", background=BackgroundTask(temp.cleanup))
    except (OSError, subprocess.SubprocessError):
        temp.cleanup()
        raise AppError(code="preview_failed", message="资料转换失败，请下载原件", status_code=503) from None
