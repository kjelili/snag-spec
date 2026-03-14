# Build Process Documentation

This document captures the rebuild and hardening process completed for this repository.

## Step 1 - Baseline Audit and Build Verification

### Actions

- Reviewed all project docs (`README`, `SUMMARY`, `DEPLOYMENT`, `INSTALLATION_FIX`).
- Audited frontend and backend implementation for runtime, workflow, and deployment gaps.
- Ran baseline checks:
  - `npm run build` (frontend)
  - `python -m compileall app` (backend)

### Findings

- Frontend had TypeScript build blockers (unused imports).
- Create Snag flow used hardcoded IDs, causing unreliable runtime behavior.
- Instruction workflow had UI/backend status mismatch.
- Config and deployment docs were incomplete for production use.

## Step 2 - Reliability and Workflow Fixes

### Actions

- Added `formatLabel()` utility for consistent status rendering.
- Fixed route usage to unified `/app/*` workspace paths.
- Added query/mutation error states across main pages.
- Fixed navigation active-state behavior for nested routes.
- Reworked instruction lifecycle:
  - Added backend endpoint `POST /api/v1/instructions/{id}/submit`
  - Updated UI flow to Draft -> Review -> Approved -> Issued
- Implemented real draft edit/save in instruction detail.
- Replaced placeholder download with text export action.

### Verification

- Frontend build succeeds after compile fixes and route cleanup.

## Step 3 - Form Flexibility Enhancements

### Actions

- Added backend endpoint `GET /api/v1/snags/meta/options` for dynamic form options.
- Updated Create Snag UI to select:
  - project
  - contract
  - defect type
  - creator
- Added project-aware contract filtering and defaults.
- Removed hidden hardcoded IDs from form submission.
- Added `created_by` support to `SnagCreate` schema and backend creation flow.

### Verification

- Snag creation payload now uses real relational IDs from API metadata.

## Step 4 - UI/UX Rebuild (Landing + Modernization)

### Actions

- Added a new landing page (`/`) with strong visual hierarchy and CTA.
- Moved workspace to `/app/*` and preserved legacy redirects.
- Improved typography system (2-font setup) and accessibility focus styles.
- Added subtle motion defaults and high-contrast visual adjustments.
- Kept touch-friendly spacing and responsive layout behavior.

### Verification

- SPA routes function with app shell + landing separation.
- Sidebar and top-level navigation remain consistent on desktop/mobile.

## Step 5 - Security and Deployment Hardening

### Actions

- Added `require_api_key` guard for write endpoints (when configured).
- Added trusted host middleware and security response headers.
- Improved settings validation for production mode (`DEBUG=False`):
  - requires non-default `SECRET_KEY`
  - requires `API_KEY`
- Added env templates:
  - `backend/.env.example`
  - `frontend/.env.example`
- Added Vercel frontend deployment config (`vercel.json`).
- Updated `README` and `DEPLOYMENT` docs for real deployment flow.

### Verification

- Backend syntax check passes (`python -m compileall app`).
- Frontend production build passes (`npm run build`).

## Outstanding Work

- Apply migration on target PostgreSQL instances and verify data seeding end-to-end.
- Add automated test suites (API + UI).
- Implement full authentication/authorization beyond API-key guard.

## Step 6 - Migration + Bootstrap Automation

### Actions

- Added initial Alembic migration file:
  - `backend/alembic/versions/20260314_0001_initial_schema.py`
- Updated Alembic env to always use runtime `settings.DATABASE_URL`.
- Added one-command setup scripts:
  - `scripts/bootstrap.ps1` (Windows)
  - `scripts/bootstrap.sh` (macOS/Linux)
- Added local PostgreSQL container recipe via `docker-compose.yml`.
- Added idempotent dev operational dataset:
  - `database/dev_bootstrap.sql`
- Updated seed SQL to ensure `pgcrypto` extension exists before inserts.

### Verification

- Bootstrap scripts validated for command flow and argument handling.
- Migration file compiles and is discoverable by Alembic.
