# Snag-to-Spec — Local-Only Deployment Guide

**Architecture:** Pure static site. No backend, no database, no server.
All data lives in the user's browser localStorage.

---

## What Changed

The backend (FastAPI + PostgreSQL) has been **removed from the deployment path**.
Your app is now a pure frontend that deploys as static HTML/JS/CSS.

| Before | After |
|--------|-------|
| Backend on Render + Frontend on Vercel | Frontend on Vercel only |
| PostgreSQL database | Browser localStorage |
| JWT auth against server | Local-only auth (roles stored in browser) |
| API keys, secrets, DB URLs | Nothing to configure |
| `psql` seeding required | Zero setup for users |

The backend code still exists in the repo for reference, but it's not needed
for deployment.

---

## Deploy to Vercel (recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Vercel auto-detects the `vercel.json` config:
   - Build command: `cd frontend && npm install && npm run build`
   - Output directory: `frontend/dist`
4. Click Deploy

That's it. No environment variables needed.

---

## Deploy Locally (development)

```powershell
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. All data in browser localStorage.

---

## Deploy as Static Files (any host)

```powershell
cd frontend
npm install
npm run build
```

The `frontend/dist/` folder contains everything. Upload it to:
- **Netlify** — drag and drop the `dist` folder
- **GitHub Pages** — push `dist` contents to `gh-pages` branch
- **Any web server** — serve `dist/` with SPA fallback (`index.html` for all routes)
- **S3 + CloudFront** — upload `dist` to bucket, configure SPA routing

---

## Files to Replace in Your Project

Copy these from the downloaded outputs into your project:

```
vercel.json                              ← replace (simplified, no backend rewrites)
frontend/.env                            ← replace (empty, nothing to configure)
frontend/.env.example                    ← replace (empty)
frontend/src/lib/api.ts                  ← replace (local-only, no axios/backend code)
frontend/src/pages/DataOwnership.tsx     ← replace (improved backup/restore UX)
frontend/src/pages/CreateSnag.tsx        ← replace (removed remote-mode conditionals)
```

---

## Files You Can Delete (optional cleanup)

These are no longer needed for deployment:

```
backend/                                 ← entire folder (keep for reference if you want)
database/                                ← entire folder (SQL seeds, not used)
docker-compose.yml                       ← PostgreSQL compose (not used)
frontend/vercel.json                     ← duplicate (root vercel.json is canonical)
bundle.js                                ← committed build artifact (not used)
```

---

## Backup & Restore

Users manage their own data via the Data Ownership page:

1. **Download backup** — exports a `.json` file to their device
2. **Restore from file** — imports a previously downloaded `.json`
3. **Cloud backup** — downloads the file, user uploads to Google Drive / OneDrive manually
4. **Reset** — clears all local data

No server needed. No accounts needed. User owns everything.

---

## What If You Need Multi-User / Server Mode Later?

The backend code is still in the repo. If you ever need:
- Shared team data across devices
- Server-side AI instruction generation (OpenAI)
- Centralized audit trail

You can re-enable it by:
1. Deploying the backend separately
2. Setting `VITE_STORAGE_MODE=remote` in `frontend/.env`
3. Setting `VITE_API_BASE_URL` to your backend URL

But for now: **local-only is the right choice**. Simpler, faster, more private, zero ops cost.
