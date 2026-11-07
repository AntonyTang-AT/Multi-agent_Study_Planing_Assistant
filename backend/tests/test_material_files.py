from pathlib import Path
from types import SimpleNamespace
import subprocess

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.models import Base, Material
from app.db.session import get_db
from app.main import create_app
from app.services import material_files


@pytest.fixture
def setup(tmp_path, monkeypatch):
    monkeypatch.setattr(material_files, "get_settings", lambda: SimpleNamespace(
        materials_root=tmp_path / "originals",
        libreoffice_binary="libreoffice",
        materials_x_accel_prefix="",
    ))
    root = tmp_path / "originals"
    root.mkdir()
    (root / "课件.pdf").write_bytes(b"%PDF-1.4\nexample")
    (root / "slides.pptx").write_bytes(b"office fixture")
    (tmp_path / "secret.pdf").write_bytes(b"secret")
    (root / "escape.pdf").symlink_to(tmp_path / "secret.pdf")
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        for key, file in [("pdf", "课件.pdf"), ("office", "slides.pptx"), ("missing", "absent.pdf"),
                          ("escape", "../secret.pdf"), ("symlink", "escape.pdf")]:
            db.add(Material(id=key, subject="math", kind="courseware", title=key, file=file))
        db.commit()
    app = create_app()
    def override_db():
        with Session(engine) as db:
            yield db
    app.dependency_overrides[get_db] = override_db
    yield TestClient(app), root
    engine.dispose()


def test_pdf_download_preview_and_status(setup):
    client, _ = setup
    items = {m["material_id"]: m for m in client.get("/api/materials").json()}
    assert items["pdf"]["available"] and items["pdf"]["preview_available"]
    assert not items["missing"]["available"]
    download = client.get("/api/materials/pdf/download")
    assert download.status_code == 200
    assert "attachment" in download.headers["content-disposition"]
    preview = client.get("/api/materials/pdf/preview")
    assert preview.content == download.content
    assert preview.headers["content-type"] == "application/pdf"
    assert "inline" in preview.headers["content-disposition"]
    assert "max-age=86400" in preview.headers.get("cache-control", "")


@pytest.mark.parametrize("key", ["missing", "escape", "symlink", "unknown"])
def test_missing_or_unsafe_never_served(setup, key):
    client, _ = setup
    for action in ["download", "preview"]:
        response = client.get(f"/api/materials/{key}/{action}")
        assert response.status_code == 404
        assert b"secret" not in response.content


def test_office_without_converter_can_download(setup, monkeypatch):
    client, _ = setup
    monkeypatch.setattr(material_files.shutil, "which", lambda _: None)
    assert client.get("/api/materials/office/download").status_code == 200
    assert client.get("/api/materials/office/preview").json()["code"] == "preview_unavailable"


def test_office_conversion_and_cleanup(setup, monkeypatch):
    client, _ = setup
    monkeypatch.setattr(material_files.shutil, "which", lambda _: "/fake/libreoffice")
    outputs = []
    def convert(args, **kwargs):
        work = Path(args[args.index("--outdir") + 1])
        assert kwargs["timeout"] == 60
        assert any(a.startswith("-env:UserInstallation=file:") for a in args)
        output = work / "source.pdf"
        outputs.append(output)
        output.write_bytes(b"%PDF-converted")
    monkeypatch.setattr(material_files.subprocess, "run", convert)
    response = client.get("/api/materials/office/preview")
    assert response.status_code == 200 and response.content == b"%PDF-converted"
    assert not outputs[0].parent.exists()
    # 二次预览应命中磁盘缓存，不再调用 LibreOffice
    response2 = client.get("/api/materials/office/preview")
    assert response2.status_code == 200 and response2.content == b"%PDF-converted"
    assert len(outputs) == 1


def test_conversion_timeout(setup, monkeypatch):
    client, _ = setup
    monkeypatch.setattr(material_files.shutil, "which", lambda _: "/fake/libreoffice")
    def fail(*args, **kwargs):
        raise subprocess.TimeoutExpired("libreoffice", 60)
    monkeypatch.setattr(material_files.subprocess, "run", fail)
    response = client.get("/api/materials/office/preview")
    assert response.status_code == 503
    assert response.json()["code"] == "preview_failed"
