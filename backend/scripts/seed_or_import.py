"""导入 data/，以及答辩种子库 demo.db 的导出/恢复。

用法（在 backend/ 下）::

    python -m scripts.seed_or_import
    python -m scripts.seed_or_import --force
    python -m scripts.seed_or_import --export-demo
    python -m scripts.seed_or_import --restore-demo
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.config import get_settings  # noqa: E402
from app.db.session import SessionLocal, init_db  # noqa: E402
from app.services.import_data import import_all, seed_if_empty  # noqa: E402

DEFAULT_DEMO_DB = BACKEND_ROOT / "demo.db"


def _sqlite_file_from_url(url: str) -> Path | None:
    prefix = "sqlite:///"
    if not url.startswith(prefix):
        return None
    raw = url[len(prefix) :]
    path = Path(raw)
    if not path.is_absolute():
        path = (BACKEND_ROOT / path).resolve()
    return path


def export_demo_db(dest: Path) -> Path:
    init_db()
    with SessionLocal() as db:
        stats = seed_if_empty(db)
        if stats:
            print("seeded before export:", stats)

    settings = get_settings()
    src = _sqlite_file_from_url(settings.database_url)
    if src is None:
        raise SystemExit(f"仅支持 SQLite 导出，当前 DATABASE_URL={settings.database_url}")
    if not src.exists():
        raise SystemExit(f"工作库不存在: {src}")

    dest = dest.resolve()
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    print(f"exported demo db: {dest}")
    return dest


def restore_demo_db(src: Path) -> Path:
    settings = get_settings()
    dest = _sqlite_file_from_url(settings.database_url)
    if dest is None:
        raise SystemExit(f"仅支持 SQLite 恢复，当前 DATABASE_URL={settings.database_url}")
    src = src.resolve()
    if not src.exists():
        raise SystemExit(
            f"找不到种子库 {src}。请先运行: python -m scripts.seed_or_import --export-demo"
        )
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    print(f"restored working db from {src} -> {dest}")
    return dest


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed / import / demo.db 导出恢复")
    parser.add_argument("--force", action="store_true", help="强制 upsert 导入")
    parser.add_argument("--data-root", type=str, default=None, help="覆盖 data/ 路径")
    parser.add_argument(
        "--export-demo",
        action="store_true",
        help="将当前 SQLite 复制为 backend/demo.db",
    )
    parser.add_argument(
        "--restore-demo",
        action="store_true",
        help="用 backend/demo.db 覆盖当前工作库",
    )
    parser.add_argument("--demo-path", type=str, default=None, help="自定义 demo.db 路径")
    args = parser.parse_args()
    demo_path = Path(args.demo_path) if args.demo_path else DEFAULT_DEMO_DB

    if args.export_demo and args.restore_demo:
        raise SystemExit("不能同时指定 --export-demo 与 --restore-demo")

    if args.export_demo:
        init_db()
        with SessionLocal() as db:
            if args.force:
                print("imported:", import_all(db, args.data_root))
            else:
                stats = seed_if_empty(db, args.data_root)
                if stats:
                    print("seeded:", stats)
        from scripts.seed_demo_accounts import seed_demo_accounts

        print("demo accounts:", seed_demo_accounts())
        export_demo_db(demo_path)
        return 0

    if args.restore_demo:
        restore_demo_db(demo_path)
        return 0

    init_db()
    with SessionLocal() as db:
        if args.force:
            print("imported:", import_all(db, args.data_root))
        else:
            stats = seed_if_empty(db, args.data_root)
            if stats is None:
                print("skipped: db already has content (use --force to re-import)")
            else:
                print("seeded:", stats)

    from scripts.seed_demo_accounts import seed_demo_accounts

    print("demo accounts:", seed_demo_accounts())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
