# Production Readiness Fixes — Applied Changes

**Date:** 20 March 2026

This document lists every fix applied from the production readiness review,
organized by the original finding number.

---

## CRITICAL Fixes

### Fix #1 — API Key Removed from Committed .env
**Files changed:** `frontend/.env`, `.gitignore`

- Replaced `frontend/.env` with safe defaults (empty `VITE_API_KEY`)
- Added explicit `frontend/.env` entry to root `.gitignore`
- **Action required:** Rotate the existing API key on Render immediately.
  The old key (`Fy3Wlmu8R96m5s8p...`) must be considered compromised.

### Fix #2 — JWT Authentication Added to Backend
**Files added:** `backend/app/core/auth.py`, `backend/app/api/v1/auth.py`
**Files changed:** `backend/app/api/v1/router.py`, `backend/app/api/v1/snags.py`,
  `backend/app/api/v1/instructions.py`

- New `auth.py` module provides: `hash_password()`, `verify_password()`,
  `create_access_token()`, `decode_token()`, `get_current_user()` dependency
- New `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/me` endpoints
- All write endpoints (`POST`, `PATCH`, `DELETE`) now require authenticated user
  via `Depends(get_current_user)`
- `created_by` on snags is always set to the authenticated user's ID
- In DEBUG mode with no API key, falls back to first active user for dev convenience
- Frontend `api.ts` updated to attach JWT token from localStorage to all requests

---

## HIGH Severity Fixes

### Fix #3 — Frontend Auth Linked to Server Tokens
**Files changed:** `frontend/src/lib/api.ts`

- Added axios request interceptor that reads `snag-spec-jwt-token` from
  localStorage and attaches it as `Authorization: Bearer` header
- When backend auth is used (remote mode), the token from `/auth/login` is
  stored and sent with every request

### Fix #4 — Predictable SECRET_KEY Removed
**Files changed:** `backend/app/core/config.py`

- Removed hardcoded default `SECRET_KEY`
- In DEBUG mode: auto-generates a random key via `secrets.token_urlsafe(48)`
- In production (DEBUG=False): raises `ValueError` if SECRET_KEY is not set
- Updated `.env.example` to document the requirement

### Fix #5 — Alembic Migration Rewritten with Proper DDL
**Files changed:** `backend/alembic/versions/20260314_0001_initial_schema.py`

- Replaced `Base.metadata.create_all()` with explicit `op.create_table()` for
  every table and `op.execute()` for every enum type
- Downgrade now drops tables individually in dependency order
- Added indexes on frequently queried columns (see Fix #26)
- Future `alembic revision --autogenerate` will now work correctly

### Fix #6 — Enum Case Mismatch Fixed in SQL Seeds
**Files changed:** `database/dev_bootstrap.sql`, `database/seed_data.sql`

- Changed all enum values from UPPERCASE to lowercase to match Python model
  definitions exactly:
  - `'ARCHITECT_PRACTICE'` → `'architect_practice'`
  - `'CONSTRUCTION'` → `'construction'`
  - `'ARCHITECT'` → `'architect'`
  - `'CRITICAL'` → `'critical'`, `'HIGH'` → `'high'`, etc.
- Added password hash for demo user (password: `demo123`) to enable login testing

### Fix #7 — Duplicate Frontend Files Resolved
**Files added:** `scripts/cleanup_duplicates.sh`
**Files changed:** `frontend/src/App.tsx`, `frontend/src/components/Layout.tsx`

- Created `scripts/cleanup_duplicates.sh` that removes all duplicate files
- Established canonical file locations:
  - `frontend/src/lib/` — api.ts, auth.ts, AuthContext.tsx, utils.ts, api.types.ts,
    userStore.ts, cloudSync.ts
  - `frontend/src/components/` — Layout.tsx, AuthGuard.tsx, UserBadge.tsx
  - `frontend/src/pages/` — all page components
- `App.tsx` imports exclusively from canonical paths
- Merged auth-aware sidebar features into `components/Layout.tsx`
- Files to delete from `frontend/src/` root: Dashboard.tsx, Landing.tsx,
  SnagDetail.tsx, LoginPage.tsx, CrewPage.tsx, AuthGuard.tsx, UserBadge.tsx,
  Layout.tsx, AuthContext.tsx, auth.ts, api.ts, api.types.ts, userStore.ts

### Fix #8 — Duplicate AuthContext Resolved
Covered by Fix #7. The canonical `AuthContext.tsx` is in `frontend/src/lib/`.

### Fix #9 — Health Check Verifies Database Connectivity
**Files changed:** `backend/app/main.py`

- `/health` endpoint now executes `SELECT 1` against the database
- Returns `{"status": "healthy", "database": "connected"}` on success
- Returns HTTP 503 with `{"status": "degraded", "database": "disconnected"}`
  when DB is unreachable
- Monitoring systems will correctly detect broken deployments

### Fix #10 — Hardcoded Credentials Removed from alembic.ini
**Files changed:** `backend/alembic.ini`

- Replaced `postgresql://snaguser:snagpass@localhost:5432/snagtospec` with
  placeholder `driver://user:pass@localhost/dbname`
- `env.py` already overrides this at runtime from `settings.DATABASE_URL`

### Fix #11 — Automated Test Suite Added
**Files added:** `backend/tests/__init__.py`, `backend/tests/test_api.py`,
  `backend/pytest.ini`
**Files changed:** `backend/requirements.txt`

- Added `pytest>=7.4.0` and `httpx>=0.25.0` to requirements
- Test suite covers:
  - Auth: register, login, duplicate email, wrong password, token validation
  - Snag CRUD: create, get, list, update, delete, filter by status
  - Instruction lifecycle: generate, submit, approve, issue, skip-step rejection
  - Pagination: limit/offset on snags and instructions
  - Health check: verifies DB status field is present
  - Meta options: validates structure has all required fields
- Run with: `cd backend && pytest tests/ -v`

---

## MEDIUM Severity Fixes

### Fix #12 — CSRF Note
CSRF protection is not strictly needed for a JSON API that doesn't use cookies
for auth (Bearer tokens are not auto-attached by browsers). Documented as
acceptable with current JWT approach.

### Fix #13 — Rate Limiting Added
**Files changed:** `backend/app/main.py`

- Added `RateLimitMiddleware` — limits write requests (POST/PATCH/PUT/DELETE)
  to 60 per minute per IP address
- Uses in-memory sliding window (appropriate for single-instance deployments)
- Returns HTTP 429 with clear error message when exceeded

### Fix #14 — Optimistic Locking Note
Not implemented in this pass. For a v1 construction app, last-write-wins is
acceptable. Documented for future hardening.

### Fix #15 — Single localStorage System
**Files changed:** `frontend/src/lib/api.ts`

- The canonical `api.ts` now imports exclusively from `userStore.ts`
- All references to the old `snag-spec-local-db-v1` key are removed
- The old `frontend/src/lib/api.ts` (which had the v1 system) is replaced
  with the new unified version

### Fix #16 — Duplicate AuthGuard Resolved
Covered by Fix #7.

### Fix #17 — OpenAI Response Parsing
The template fallback works reliably. The JSON parsing TODO is documented
but not a production blocker since the fallback generates valid instructions.

### Fix #18 — Connection Pool Recycling Added
**Files changed:** `backend/app/core/database.py`

- Added `pool_recycle=1800` (30 minutes) to SQLAlchemy engine configuration
- Prevents stale connections behind managed DB proxies (Render, PgBouncer)

### Fix #19 — OpenAI Error Handling
The existing try/except with template fallback is adequate. No change needed.

### Fix #20 — Dockerfiles Added
**Files added:** `backend/Dockerfile`, `frontend/Dockerfile`

- Backend: Python 3.11-slim with psycopg2 system deps, uvicorn CMD
- Frontend: Multi-stage build (Node 18 → nginx), SPA fallback configured

### Fix #21 — Duplicate vercel.json Resolved
**Action required:** Delete `frontend/vercel.json`. Keep only root `vercel.json`.

### Fix #22 — Pagination Added to List Endpoints
**Files changed:** `backend/app/api/v1/snags.py`, `backend/app/api/v1/instructions.py`

- Both `GET /snags` and `GET /instructions` now accept `limit` and `offset`
  query parameters
- Default: 50 items, max: 200 items
- Validated via FastAPI `Query()` with `ge` and `le` constraints

---

## LOW Severity Fixes

### Fix #23 — bundle.js
**Action required:** Delete `bundle.js` from repo root and add it to `.gitignore`.
The cleanup script handles this.

### Fix #24 — Request Timeout on Axios
**Files changed:** `frontend/src/lib/api.ts`

- Added `timeout: 30000` (30 seconds) to axios instance configuration

### Fix #25 — Database Indexes Added
**Files changed:** `backend/alembic/versions/20260314_0001_initial_schema.py`

- Added indexes on: `snags.project_id`, `snags.status`, `snags.severity`,
  `snags.contract_id`, `snags.created_by`, `instructions.project_id`,
  `instructions.status`, `instructions.snag_id`, `contracts.project_id`,
  `clause_nodes.contract_edition_id`

---

## How to Apply These Changes

1. **Run the cleanup script:**
   ```bash
   bash scripts/cleanup_duplicates.sh
   ```

2. **Delete the duplicate frontend vercel.json:**
   ```bash
   rm frontend/vercel.json
   ```

3. **Rotate the API key** on your Render deployment

4. **Set SECRET_KEY** in your backend .env:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

5. **Re-run migrations** (the new migration replaces the old create_all approach):
   ```bash
   cd backend
   alembic downgrade base   # if existing DB
   alembic upgrade head
   ```

6. **Re-seed the database:**
   ```bash
   psql $DATABASE_URL -f database/seed_data.sql
   psql $DATABASE_URL -f database/dev_bootstrap.sql
   ```

7. **Run the test suite:**
   ```bash
   cd backend
   pip install -r requirements.txt
   pytest tests/ -v
   ```
