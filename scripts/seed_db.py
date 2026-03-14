"""
Seed PostgreSQL database from SQL files using psycopg2.

Usage (from project root):
  python scripts/seed_db.py --database-url "postgresql://.../?sslmode=require" --files database/seed_data.sql database/dev_bootstrap.sql
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import psycopg2


def ensure_sslmode(database_url: str) -> str:
    parsed = urlparse(database_url)
    query = dict(parse_qsl(parsed.query))

    host = parsed.hostname or ""
    if "sslmode" not in query and ("render.com" in host or host.startswith("dpg-")):
        query["sslmode"] = "require"

    if query:
        parsed = parsed._replace(query=urlencode(query))
    return urlunparse(parsed)


def run_sql_file(conn, sql_file: Path) -> None:
    if not sql_file.exists():
        raise FileNotFoundError(f"SQL file not found: {sql_file}")

    sql = sql_file.read_text(encoding="utf-8")
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print(f"OK: {sql_file}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed PostgreSQL database with SQL files.")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL", ""), help="Postgres connection URL")
    parser.add_argument(
        "--files",
        nargs="+",
        default=["database/seed_data.sql", "database/dev_bootstrap.sql"],
        help="SQL files to execute in order",
    )
    args = parser.parse_args()

    if not args.database_url:
        raise ValueError("DATABASE_URL is required. Pass --database-url or set DATABASE_URL env var.")

    database_url = ensure_sslmode(args.database_url)
    files = [Path(file).resolve() for file in args.files]

    conn = psycopg2.connect(database_url)
    try:
        for sql_file in files:
            run_sql_file(conn, sql_file)
    finally:
        conn.close()

    print("Database seeding complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
