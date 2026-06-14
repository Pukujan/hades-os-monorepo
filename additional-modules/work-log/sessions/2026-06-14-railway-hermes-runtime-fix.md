# Session: Railway Root + Hermes-Required Runtime Fix

**Date:** 2026-06-14
**Slug:** railway-hermes-runtime-fix
**State:** active

## Purpose

Fix Hades OS Railway deployment backend root + Hermes-required runtime. Not just a root-directory fix — backend container must include Hermes CLI.

## Key Principles

1. **Layer 1:** Railway must deploy `backend/` not repo root.
2. **Layer 2:** Backend container must include Hermes CLI at runtime.
3. **Production rule:** No Hermes, no successful Hades chat.
4. No non-Hermes fallback (no OpenRouter, no mock, no generic AI).
5. Shared Hermes binary is fine. Shared local user memory is not fine.
6. Durable multi-user memory belongs in Supabase, scoped by auth user_id.

## Tasks (Groups A–G)

### Group A — Railway Root Deployment
- `railway.toml`: `rootDirectory = backend`, correct install/start commands
- `backend/Dockerfile` for Hermes CLI packaging (if Python/system deps needed)
- `backend/.dockerignore`

### Group B — Hermes Binary Resolution
- `HERMES_BIN_PATH` > `PATH` > dev fallback (dev only)
- Production missing binary → controlled error, not silent fallback

### Group C — Hermes Writable State Isolation
- `HERMES_HOME` / `HERMES_CACHE_DIR` honored when set
- Production defaults to safe temp paths (not `~/.hermes`)

### Group D — Non-Hermes Fallback Removal
- `config/index.js`: no `hermesMode` or `userId` fallback defaults
- No `openRouterClient` import in `hermes.service.js`

### Group E — CORS
- Extracted `cors.js` middleware with env-based whitelist
- Replaced `app.use(cors())` in `app.js`

### Group F — Browser Config Safety
- Only expose `SUPABASE_URL` + `SUPABASE_ANON_KEY`
- Never expose `SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, etc.

### Group G — Auth/User Scoping
- Production `userId` from verified auth token, never `HADES_USER_ID`
- `HADES_USER_ID` is dev/test fallback only

## Red Tests Created

- `backend/src/modules/hades/tests/unit/hermesRuntime.binaryResolution.test.js`
- `backend/src/modules/hades/tests/unit/hermesRuntime.writableState.test.js`
- `backend/src/modules/hades/tests/unit/nonHermesFallback.test.js`
- `backend/src/modules/hades/tests/unit/cors.test.js`
- `backend/src/modules/hades/tests/unit/productionUserScoping.test.js`
- `backend/src/modules/auth/tests/unit/browserConfig.secureKeys.test.js`

## Files Changed So Far

- `backend/src/core/app.js` — `app.use(cors())` → `createCorsMiddleware(process.env.CORS_ORIGIN)`
- `backend/src/modules/hades/services/cors.js` — new module

## Remaining Work

- Fix `auth.routes.js`: safe-keys filter for browser-config
- Fix `hermesRuntime.service.js`: binary resolution + writable state
- Fix `config/index.js`: remove fallback defaults
- Fix `hades.service.js`: production userId scoping
- Update `railway.toml`: rootDirectory, build/start commands
- Create `Dockerfile` + `.dockerignore`
- Update deploy contract (`monorepoDeploy.contract.js`)
- Update `DEPLOY.md`
- Update `.env.example`
- Update lint-deploy test
- Update existing `browserConfig.routes.test.js`
- Run all tests

## Handoff Prompt (Full)

```
# OpenCode Handoff — Railway Root Fix + Hermes-Required Runtime

## Purpose
Fix Hades OS Railway deployment with Hermes as required runtime.

## Current known facts
- Vercel hosts frontend from frontend/.
- Railway hosts backend from backend/.
- Railway currently fails because Railpack deploys from repo root.
- Repo root package.json has no start command.
- Backend entrypoint: backend/src/core/server.js
- Backend start: npm run start, PORT=process.env.PORT || 3001
- Backend currently spawns Hermes from ~/.hermes/hermes-agent/venv/bin/hermes
- Railway cannot access developer ~/.hermes
- Hermes is mandatory for Hades chat
- No non-Hermes fallback allowed
- Supabase persistence wired for conversations/messages/executions/minions/connections
- HADES_USER_ID=local-user must not be global production identity

## Production rule
No Hermes, no successful Hades chat.

## Tasks
1. Fix Railway root to backend/
2. Hermes binary resolution: HERMES_BIN_PATH > PATH > dev fallback
3. Package/install Hermes CLI in Railway container
4. Isolate Hermes writable state (HERMES_HOME=/tmp/hades-hermes)
5. Auth scoping: userId from verified auth
6. CORS: env-based whitelist
7. Browser config safety: only SUPABASE_URL + SUPABASE_ANON_KEY
8. Update DEPLOY.md
9. Validation: backend tests, frontend tests, build
```

## Allowed Host Origins (CORS)

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `https://<vercel-frontend-url>`

## Env Vars Needed

### Railway
```
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://<vercel-frontend-url>
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
ENCRYPTION_KEY=...
HERMES_REQUIRED=true
HERMES_BIN_PATH=<path-to-hermes>
HERMES_HOME=/tmp/hades-hermes
OPENROUTER_API_KEY=...
HERMES_PROVIDER=...
HERMES_MODEL=...
```

### Vercel
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Validation

```bash
cd backend && npm test
cd frontend && npm test && npm run build
```
