# Handoff: Hosted Runtime Readiness TDD

## Purpose

Prepare the Hades OS MVP for Railway + Vercel hosting by adding test-first runtime readiness checks, stronger persistence guarantees, and a repeatable smoke script.

This handoff is written for the next 5.4 implementation pass. Write the tests first, watch them fail, then implement the smallest code needed to pass.

## Current State

- Prototype-preserving React app is implemented.
- Backend Hades write routes exist:
  - `POST /api/hades/chat`
  - `POST /api/hades/minions/test`
  - `POST /api/hades/minions`
  - `POST /api/hades/assignments`
- Backend bootstrap route exists:
  - `GET /api/hades/bootstrap`
- Frontend hydrates from backend bootstrap.
- Hermes now uses OpenRouter DeepSeek V4 Flash with local fallback.
- Railway/Vercel deploy contract exists and is linted.
- Supabase repository behavior is partially covered with fake-client tests, but hosted readiness and readback guarantees need tightening.

## External Docs Checked

- Railway monorepo docs: https://docs.railway.com/deployments/monorepo
- Vercel monorepo docs: https://vercel.com/docs/monorepos
- Supabase API key docs: https://supabase.com/docs/guides/getting-started/api-keys
- OpenRouter quickstart: https://openrouter.ai/docs/quickstart

## Phase Goal

By the end of this phase, a developer can run one local command and know whether the MVP is ready to host:

```txt
backend secrets are server-only
OpenRouter is configured without exposing keys
Supabase persistence can write and read MVP entities
frontend points to the backend through VITE_API_BASE_URL
Railway owns backend/
Vercel owns frontend/
the core minion flow passes as an automated smoke path
```

## TDD Rule

Do not start with implementation. Add the tests in this handoff first.

Expected order:

```txt
1. Write failing backend readiness tests.
2. Write failing Supabase readback tests.
3. Write failing smoke script tests.
4. Implement backend readiness/config helpers.
5. Implement missing Supabase readback behavior.
6. Implement smoke script.
7. Run full validation.
```

## Slice 1: Backend Runtime Readiness

Add tests first:

```txt
backend/src/modules/hades/tests/unit/hades.config.test.js
backend/src/modules/hades/tests/integration/hades.readiness.routes.test.js
```

Required behavior:

- `getHadesConfig()` returns OpenRouter defaults without requiring a key locally.
- `OPENROUTER_API_KEY` is never returned by any API response.
- `GET /api/hades/readiness` returns a non-secret status shape.
- Readiness reports:
  - `storage.mode`
  - `storage.configured`
  - `ai.provider`
  - `ai.model`
  - `ai.configured`
  - `cors.origin`
  - `deploy.backendPlatform`
  - `deploy.frontendPlatform`
- Missing OpenRouter key should not break local dev, but should mark `ai.configured=false`.
- Missing Supabase service role should not break local dev, but should mark `storage.configured=false`.

Suggested response shape:

```ts
type HadesReadinessResponse = {
  status: "ok"
  mode: "local" | "hosted"
  storage: {
    mode: "memory" | "supabase"
    configured: boolean
  }
  ai: {
    provider: "openrouter"
    model: string
    configured: boolean
  }
  cors: {
    origin: string | null
  }
  deploy: {
    backendPlatform: "railway"
    frontendPlatform: "vercel"
  }
}
```

Do not include:

```txt
OPENROUTER_API_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
raw process.env
```

## Slice 2: Supabase MVP Readback

Add tests first:

```txt
backend/src/modules/hades/tests/unit/hades.supabase.readback.test.js
```

Required behavior:

- Fake Supabase client can persist and read back:
  - conversations
  - chat messages
  - minions
  - assignments
  - test runs
- `GET /api/hades/bootstrap` should include saved minions and assignments after writes.
- Conversation draft snapshots should survive repository readback.
- Repository should still work in memory mode with no Supabase env.

Acceptance note:

Supabase secret keys are server-only. The frontend must never receive or reference `SUPABASE_SERVICE_ROLE_KEY`.

## Slice 3: Automated MVP Smoke Script

Add tests first:

```txt
scripts/smoke-hades-runtime.test.mjs
```

Add script:

```txt
scripts/smoke-hades-runtime.mjs
```

Root package script:

```json
{
  "scripts": {
    "smoke:hades": "node scripts/smoke-hades-runtime.mjs"
  }
}
```

Required behavior:

- Accept `HADES_API_BASE_URL`.
- Default local API to `http://127.0.0.1:3001`.
- Call:
  - `GET /api/health`
  - `GET /api/hades/readiness`
  - `GET /api/hades/bootstrap`
  - `POST /api/hades/chat`
  - `POST /api/hades/minions/test`
  - `POST /api/hades/minions`
  - `POST /api/hades/assignments`
  - `GET /api/hades/bootstrap`
- Fail clearly if any step returns non-2xx.
- Print a concise success summary with:
  - conversation id
  - saved minion id
  - assignment id
  - readiness mode

Test cases:

- successful smoke path with mocked fetch
- failed health response stops early
- failed chat response includes route name in the thrown error
- script never logs server secrets

## Slice 4: Frontend Hosted Env Guard

Add tests first:

```txt
frontend/src/shared/api/client.test.js
frontend/src/modules/hades/hadesHostedApi.test.js
```

Required behavior:

- `VITE_API_BASE_URL` is the only frontend backend-origin env.
- Frontend API helpers never reference:
  - `OPENROUTER_API_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY`
- Production build should use `VITE_API_BASE_URL` for backend calls.
- Local fallback can remain `http://localhost:3001` or `http://127.0.0.1:3001`, but tests should make the fallback explicit.

## Slice 5: Hosted Manual Smoke Checklist

After tests pass and deployment is available:

```txt
1. Open Vercel app URL at /app/home.
2. Send: I want a command to send cat memes in Discord.
3. Confirm assistant response appears.
4. Confirm draft card fills.
5. Provide command name if asked.
6. Test the draft.
7. Save the minion.
8. Assign it to Discord placeholder.
9. Refresh.
10. Confirm bootstrap restores saved minion and assignment.
```

## Verification Commands

Run all of these before handing back:

```bash
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run build
npm run lint:deploy
npm run test:deploy
npm run smoke:hades
```

If the backend is not running locally, `npm run smoke:hades` should fail with a clear connection message rather than a stack trace.

## Done When

- New tests exist and pass.
- `GET /api/hades/readiness` exists and exposes no secrets.
- Supabase readback behavior is tested.
- Smoke script exists and tests pass.
- Deploy docs mention `npm run smoke:hades`.
- No server-only secrets appear in `frontend/`.
- Manual browser smoke passes locally.

## Do Not Build In This Phase

```txt
real Discord deployment
real Telegram deployment
marketplace payments
creator payouts
multi-user auth
worker execution
real command execution
```
