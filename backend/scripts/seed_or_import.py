"""手动导入 / 强制重导入 data/ 到 SQLite。

用法（在 backend/ 下）::

    python -m scripts.seed_or_import
    python -m scripts.seed_or_import --force
    python -m scripts.seed_or_import --data-root ../data
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal, init_db  # noqa: E402
from app.services.import_data import import_all, seed_if_empty  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed / import data/ into SQLite")
    parser.add_argument(
        "--force",
        action="store_true",
        help="强制 upsert 导入（忽略空库判断）",
    )
    parser.add_argument(
        "--data-root",
        type=str,
        default=None,
        help="覆盖默认 data/ 路径",
    )
    args = parser.parse_args()

    init_db()
    with SessionLocal() as db:
        if args.force:
            stats = import_all(db, args.data_root)
            print("imported:", stats)
        else:
            stats = seed_if_empty(db, args.data_root)
            if stats is None:
                print("skipped: db already has content (use --force to re-import)")
            else:
                print("seeded:", stats)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
