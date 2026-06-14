# Deploy layout

This monorepo deploys as **two independent targets**. Railway hosts `backend/` only. Vercel hosts `frontend/` only.

| Target | Directory | Platform |
|--------|-----------|----------|
| API | `backend/` | Railway |
| UI | `frontend/` | Vercel |

## Backend

- Entry: `npm run start` in `backend/`
- Config: `backend/railway.toml`
- Local env template: `backend/.env.example`
- **Railway dashboard settings:**
  - `Root Directory`: `backend`
  - `Build Command`: leave blank (uses `backend/railway.toml` Nixpacks builder)
  - `Start Command`: `npm run start`
  - Without these, Railway builds from the repo root and skips backend deps.
- **Root build safety net:** `package.json` `build` script runs `npm --prefix backend ci` as a fallback if Railway ignores Root Directory.
- Do not add `backend/vercel.json`.
- Required Railway env vars: `NODE_ENV`, `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `ENCRYPTION_KEY`, `HERMES_REQUIRED`, `CORS_ORIGIN`.

### Hermes CLI on Railway

Hermes is a Python CLI binary required at runtime. Two packaging strategies:

1. **Railpack + Dockerfile** (recommended): Include a `backend/Dockerfile` that installs Hermes via `pip install hermes` or a pre-built binary, so it's available in the deploy image.
2. **Pre-installed binary**: Set `HERMES_BIN_PATH` to a custom Hermes location if it ships with the base image.

Environment variables:
- `HERMES_BIN_PATH` — override Hermes binary location (optional; defaults to `PATH` lookup)
- `HERMES_HOME` — writable directory for Hermes state (defaults to `/tmp/hades-hermes`)
- `HERMES_REQUIRED` — set to `"true"` (default) to fail with 503 if Hermes is unavailable

## Frontend

- Build: `npm run build` → `frontend/dist/`
- SPA rewrites: `frontend/vercel.json`
- Set `VITE_API_BASE_URL` to your public API origin (no trailing slash).
- Local env template: `frontend/.env.example` copied to `frontend/.env.local`
- Do not add `frontend/railway.toml`.
- **Vercel dashboard settings:**
  - `Root Directory`: `frontend`
  - `Framework Preset`: `Vite`
  - `Build Command`: `npm run build`
  - `Output Directory`: `dist`
  - Without these, Vercel builds from the repo root and runs `echo 'Build handled by Dockerfile'` instead of `vite build`.
- Required Vercel env var: `VITE_API_BASE_URL`.

## Root package.json

The repo root orchestrates lint, tests, and scaffolding scripts. It defines `start` as a local-dev convenience (`npm --prefix backend run start`) and `build` as a Railway safety net that installs backend deps (`npm --prefix backend ci`).

> **Why root build exists:** Railway's Railpack build sometimes ignores `rootDirectory = "backend"` in the root `railway.toml` and builds from repo root. The root build script ensures backend dependencies are installed even if Railway builds from root. The **primary** fix is the Railway dashboard Root Directory setting; root build is a belt-and-suspenders fallback.

## Verify

```bash
npm run lint:deploy
npm run test:deploy
npm run smoke:hades
```
