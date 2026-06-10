# Deploy layout

This monorepo deploys as **two independent targets**:

| Target | Directory | Platform |
|--------|-----------|----------|
| API | `backend/` | Railway (or any Node host) |
| UI | `frontend/` | Vercel (or any static host) |

## Backend

- Entry: `npm run start` in `backend/`
- Config: `backend/railway.toml`
- Local env template: `backend/.env.example`

## Frontend

- Build: `npm run build` → `frontend/dist/`
- SPA rewrites: `frontend/vercel.json`
- Set `VITE_API_BASE_URL` to your public API origin (no trailing slash).
- Local env template: `frontend/.env.example` copied to `frontend/.env.local`

## Root package.json

The repo root orchestrates lint, tests, and scaffolding scripts only. It must **not** define a `start` script.

## Verify

```bash
npm run lint:deploy
```
