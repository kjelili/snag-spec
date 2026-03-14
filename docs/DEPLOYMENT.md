# Deployment Guide

## 1) Local Bootstrapping

### One-command setup

- Windows PowerShell: `.\scripts\bootstrap.ps1`
- macOS/Linux: `bash ./scripts/bootstrap.sh`

Flags:

- PowerShell: `-SkipSeed`, `-SkipFrontendBuild`
- Bash: `SKIP_SEED=true SKIP_FRONTEND_BUILD=true`

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env
```

Set in `backend/.env` at minimum:

- `DATABASE_URL`
- `SECRET_KEY`
- `API_KEY` (required in production mode)
- `CORS_ORIGINS`
- `ALLOWED_HOSTS`

Then run:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

If PostgreSQL is not running locally, use Docker:

```bash
docker compose up -d postgres
```

Load optional demo operational data:

```bash
docker cp "database/dev_bootstrap.sql" snag-spec-postgres:/tmp/dev_bootstrap.sql
docker exec snag-spec-postgres psql -U postgres -d snagtospec -f /tmp/dev_bootstrap.sql
```

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Set in `frontend/.env`:

- `VITE_API_BASE_URL` (example: `http://localhost:8000/api/v1`)
- `VITE_DEV_PROXY_TARGET` (example: `http://localhost:8000`)
- `VITE_API_KEY` (required only if backend `API_KEY` is set)

## 2) Production Hardening Checklist

- Set `DEBUG=False` in backend.
- Replace `SECRET_KEY` with a long random value.
- Set non-empty `API_KEY` and pass it as `X-API-Key` on write requests.
- Set strict `CORS_ORIGINS` to known frontend domains.
- Set strict `ALLOWED_HOSTS` to deployment hosts.
- Enable HTTPS at your backend host.

## 3) Vercel Frontend Deployment

This repository includes `vercel.json` configured for the frontend SPA:

- install command: `cd frontend && npm install`
- build command: `cd frontend && npm run build`
- output directory: `frontend/dist`
- rewrite all routes to `index.html` for client-side routing

### Deploy Steps

1. Import repository into Vercel.
2. Keep Root Directory as repository root.
3. Add environment variable:
   - `VITE_API_BASE_URL=https://<your-backend-domain>/api/v1`
4. Deploy.

## 4) Backend Hosting

Backend is a FastAPI service and should be deployed on an API-capable platform (Render, Railway, Fly.io, ECS, etc.) with PostgreSQL access.

Recommended production command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 5) Validation Endpoints

- Health: `GET /health`
- API docs: `GET /api/docs`
- API probe: `GET /api/v1/test`

Note: opening the backend root URL (e.g. Render service URL) returns API metadata JSON by design.  
Your user-facing web app should be the Vercel frontend URL.
