# Snag-to-Spec

Snag-to-Spec is a contract-intelligence web app for construction teams. It captures defects ("snags"), suggests relevant contract clauses, and supports architect instruction workflows.

## Current Stack

- Frontend: React + TypeScript + Vite + Tailwind
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL
- AI drafting: OpenAI-backed service with template fallback

## Project Structure

```
snag-spec/
├── backend/          # FastAPI API
├── frontend/         # React SPA
├── database/         # Seed data
├── docs/             # Build + deployment documentation
└── vercel.json       # Frontend Vercel deployment config
```

## Local Development

### One-command bootstrap

- Windows PowerShell:
  - `.\scripts\bootstrap.ps1`
- macOS/Linux:
  - `bash ./scripts/bootstrap.sh`

Optional flags:

- PowerShell: `-SkipSeed`, `-SkipFrontendBuild`
- Bash env flags: `SKIP_SEED=true SKIP_FRONTEND_BUILD=true`

To load demo operational records (project/user/contract) after migration:

- `docker cp "database/dev_bootstrap.sql" snag-spec-postgres:/tmp/dev_bootstrap.sql`
- `docker exec snag-spec-postgres psql -U postgres -d snagtospec -f /tmp/dev_bootstrap.sql`

Windows-friendly alternative (no `psql` needed), from project root:

- `python scripts/seed_db.py --database-url "YOUR_DATABASE_URL"`

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

If PostgreSQL is not installed locally, start the bundled container:

- `docker compose up -d postgres`

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend app opens at `http://localhost:3000`, API docs at `http://localhost:8000/api/docs`.

## Security Defaults

- Write endpoints support `X-API-Key` enforcement when `API_KEY` is configured.
- Security headers and trusted-host middleware are enabled.
- Production mode (`DEBUG=False`) requires non-default `SECRET_KEY` and `API_KEY`.

## Documentation

- `docs/BUILD_PROCESS.md` - full rebuild and verification log
- `docs/DEPLOYMENT.md` - local + production + Vercel deployment guidance
- `docs/SUMMARY.md` - architecture and current implementation summary
