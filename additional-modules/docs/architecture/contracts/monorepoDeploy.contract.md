# Contract: monorepo deploy layout

**Version:** `v004`  
**Code:** `backend/src/shared/contracts/monorepoDeploy.contract.js`  
**Lint:** `scripts/lint-deploy.test.mjs`  
**User doc:** [DEPLOY.md](../../DEPLOY.md)

## Purpose

Codify that this repository deploys as **two independent targets** — not a single root deploy. Railway hosts `backend/` only. Vercel hosts `frontend/` only.

## Deploy targets

| Target | Root directory | Platform | Role |
|--------|----------------|----------|------|
| `backend` | `backend/` | Railway | Express API, agent runs, optional Postgres/SQLite |
| `frontend` | `frontend/` | Vercel | React SPA (module registry routes) |

## Required artifacts (lint-enforced)

| Check | Path / rule |
|-------|-------------|
| Backend `start` script | `backend/package.json` → `scripts.start` |
| Backend Railway config | `railway.toml` (root — sets `builder = "DOCKERFILE"`, `rootDirectory = "backend"`) |
| No backend Vercel config | `backend/vercel.json` must not exist |
| Frontend Vercel SPA rewrites | `frontend/vercel.json` → `rewrites` |
| No frontend Railway config | `frontend/railway.toml` must not exist |
| Env templates | `backend/.env.example`, `frontend/.env.example` |
| Frontend build output | `frontend/package.json` → `vite build` → `dist/` |
| Deploy guide | `docs/DEPLOY.md` |
| Root must **not** have `start` | root `package.json` (prevents accidental repo-root Railway deploy) |
| API client uses env base URL | `frontend/src/shared/api/client.js` → `VITE_API_BASE_URL` |

## Environment variables

### Backend (Railway)

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `production` on Railway |
| `PORT` | Railway-provided port |
| `HERMES_BIN_PATH` | Set in Dockerfile: `/opt/hermes-venv/bin/hermes` |
| `HERMES_HOME` | Writable directory for Hermes state (defaults to `/tmp/hades-hermes`) |
| `HERMES_REQUIRED` | `true` to fail with 503 if Hermes is unavailable |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase key |
| `SUPABASE_ANON_KEY` | Optional public Supabase key |
| `OPENROUTER_BASE_URL` | OpenRouter API base URL |
| `OPENROUTER_API_KEY` | Server-only OpenRouter key |
| `OPENROUTER_MODEL` | OpenRouter model slug, defaults to `deepseek/deepseek-v4-flash` |
| `CORS_ORIGIN` | Vercel frontend origin |

### Frontend (Vercel, build time)

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Public Railway backend URL (no trailing slash) |

## Root package.json rule

The repo root `package.json` orchestrates lint, tests, and file-exchange scripts only. It must **not** define a `start` script — that would invite deploying the entire monorepo as one Node service.

## Verification

```bash
npm run lint:deploy
npm run test:deploy
npm run lint:contracts
```
