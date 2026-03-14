#!/usr/bin/env bash
set -euo pipefail

SKIP_SEED="${SKIP_SEED:-false}"
SKIP_FRONTEND_BUILD="${SKIP_FRONTEND_BUILD:-false}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
SEED_SQL="$ROOT_DIR/database/seed_data.sql"

step() {
  echo
  echo "==> $1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command python3
require_command npm

step "Setting up backend virtual environment"
if [ ! -d "$BACKEND_DIR/venv" ]; then
  python3 -m venv "$BACKEND_DIR/venv"
fi

VENV_PY="$BACKEND_DIR/venv/bin/python"
if [ ! -f "$VENV_PY" ]; then
  echo "Missing venv python executable at $VENV_PY" >&2
  exit 1
fi

step "Installing backend dependencies"
"$VENV_PY" -m pip install --upgrade pip
"$VENV_PY" -m pip install -r "$BACKEND_DIR/requirements.txt"

if [ ! -f "$BACKEND_DIR/.env" ]; then
  step "Creating backend .env from template"
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
fi

step "Running backend migrations"
(
  cd "$BACKEND_DIR"
  if ! "$VENV_PY" -m alembic upgrade head; then
    echo "Migration failed. Ensure PostgreSQL is running and DATABASE_URL is correct." >&2
    echo "Quick start: docker compose up -d postgres" >&2
    exit 1
  fi
)

if [ "$SKIP_SEED" != "true" ]; then
  if command -v psql >/dev/null 2>&1; then
    step "Loading seed data (optional)"
    DATABASE_URL_VALUE="${DATABASE_URL:-}"
    if [ -z "$DATABASE_URL_VALUE" ] && [ -f "$BACKEND_DIR/.env" ]; then
      DATABASE_URL_VALUE="$(grep -E '^DATABASE_URL=' "$BACKEND_DIR/.env" | head -n1 | cut -d= -f2- || true)"
    fi

    if [ -n "$DATABASE_URL_VALUE" ]; then
      psql "$DATABASE_URL_VALUE" -f "$SEED_SQL"
    else
      echo "Skipping seed load: DATABASE_URL not set."
    fi
  else
    echo "Skipping seed load: psql not installed."
  fi
fi

step "Setting up frontend dependencies"
(
  cd "$FRONTEND_DIR"
  npm install
)

if [ ! -f "$FRONTEND_DIR/.env" ]; then
  step "Creating frontend .env from template"
  cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
fi

if [ "$SKIP_FRONTEND_BUILD" != "true" ]; then
  step "Running frontend production build"
  (
    cd "$FRONTEND_DIR"
    npm run build
  )
fi

echo
echo "Bootstrap completed successfully."
echo "Next steps:"
echo "1) Backend: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "2) Frontend: cd frontend && npm run dev"
