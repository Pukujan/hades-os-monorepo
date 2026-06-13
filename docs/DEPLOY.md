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
- Hermes sync reads `backend/.env` as the shared source of truth for the backend app and Hermes CLI.
- Do not add `backend/vercel.json`.
- Railway service root must be `backend/`.
- Required Railway env vars: `NODE_ENV`, `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `CORS_ORIGIN`.

## Frontend

- Build: `npm run build` → `frontend/dist/`
- SPA rewrites: `frontend/vercel.json`
- Set `VITE_API_BASE_URL` to your public API origin (no trailing slash).
- Local env template: `frontend/.env.example` copied to `frontend/.env.local`
- Do not add `frontend/railway.toml`.
- Vercel project root must be `frontend/`.
- Required Vercel env var: `VITE_API_BASE_URL`.

## Root package.json

The repo root orchestrates lint, tests, and scaffolding scripts only. It must **not** define a `start` script.

## Verify

```bash
npm run lint:deploy
npm run test:deploy
npm run smoke:hades
```
