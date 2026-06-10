# Contract: monorepo deploy layout

**Version:** `v001`  
**Code:** `backend/src/shared/contracts/monorepoDeploy.contract.js`  
**Lint:** `scripts/lint-deploy.mjs`  
**User doc:** [DEPLOY.md](../../DEPLOY.md)

## Purpose

Codify that this repository deploys as **two independent targets** — not a single root deploy. Railway hosts only the Node API; Vercel hosts only the Vite static frontend.

## Deploy targets

| Target | Root directory | Platform | Role |
|--------|----------------|----------|------|
| `backend` | `backend/` | Railway | Express API, agent runs, optional Postgres/SQLite |
| `frontend` | `frontend/` | Vercel | React SPA (module registry routes) |

## Required artifacts (lint-enforced)

| Check | Path / rule |
|-------|-------------|
| Backend `start` script | `backend/package.json` → `scripts.start` |
| Backend Railway config | `backend/railway.toml` |
| Frontend Vercel SPA rewrites | `frontend/vercel.json` → `rewrites` |
| Frontend build output | `frontend/package.json` → `vite build` → `dist/` |
| Deploy guide | `docs/DEPLOY.md` |
| Root must **not** have `start` | root `package.json` (prevents accidental repo-root Railway deploy) |
| API client uses env base URL | `frontend/src/shared/api/client.js` → `VITE_API_BASE_URL` |

## Environment variables

### Backend (Railway)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite file URL locally; Neon Postgres URL in production |
| `QUEUE_DISABLED` | Set `true` for inline demo queue (no Redis) |

### Frontend (Vercel, build time)

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Public Railway backend URL (no trailing slash) |

## Root package.json rule

The repo root `package.json` orchestrates lint, tests, and file-exchange scripts only. It must **not** define a `start` script — that would invite deploying the entire monorepo as one Node service.

## Verification

```bash
npm run lint:deploy
npm run lint:contracts
```
