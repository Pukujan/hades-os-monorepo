# Handoff: Railway + Vercel Hosting TDD Phase

## Purpose

Finish the hosting preparation for Hades OS with an explicit platform split:

```txt
Railway hosts backend/ only.
Vercel hosts frontend/ only.
```

Do not deploy the monorepo root as a single service. Do not put the API on Vercel. Do not put the frontend on Railway.

## Current State

- Backend Hades write routes exist and pass tests.
- Hermes service now uses OpenRouter DeepSeek V4 Flash with local fallback.
- Supabase-shaped repository adapter exists and passes tests.
- Env templates exist:
  - `backend/.env.example`
  - `frontend/.env.example`
- Local backend env has been filled by the user.
- Local frontend env was created with `VITE_API_BASE_URL=http://127.0.0.1:3001`.
- Deploy contract now has explicit Railway/Vercel ownership tests.

## Today Checklist

1. Verify deploy contract tests.
2. Add backend bootstrap/read endpoint with TDD.
3. Add frontend hydration with TDD.
4. Run local backend + frontend smoke test.
5. Deploy backend from `backend/` to Railway.
6. Deploy frontend from `frontend/` to Vercel.
7. Set Railway env vars from `backend/.env.example`.
8. Set Vercel env var from `frontend/.env.example`.
9. Run hosted smoke test from the Vercel URL.
10. Document final Railway URL and Vercel URL in a dev log or handoff update.

## Tests Already Added For This Phase

```txt
scripts/lint-deploy.test.mjs
```

This test verifies:

- backend target is `backend/` on Railway
- frontend target is `frontend/` on Vercel
- `backend/railway.toml` exists
- `frontend/vercel.json` exists
- `backend/vercel.json` does not exist
- `frontend/railway.toml` does not exist
- env templates document the required hosting variables
- `docs/DEPLOY.md` explicitly states the platform split

Run:

```bash
npm run lint:deploy
npm run test:deploy
```

## Next TDD Slice: Bootstrap Reads

Write failing tests first.

### Backend Tests To Add

```txt
backend/src/modules/hades/tests/integration/hades.bootstrap.routes.test.js
backend/src/modules/hades/tests/unit/hades.bootstrap.service.test.js
backend/src/modules/hades/tests/unit/hades.bootstrap.repository.test.js
```

Minimum assertions:

- `GET /api/hades/bootstrap` returns `userId`, `conversationId`, `messages`, `draft`, `minions`, `assignments`, `socialLinks`, and `levelState`.
- Empty storage returns starter/default state.
- After save + assign routes run, bootstrap returns the saved minion and assignment.
- Supabase-backed repository can read the same shapes it writes.
- Response shape is stable enough for frontend hydration.

### Frontend Tests To Add

```txt
frontend/src/modules/hades/hadesHydration.test.js
```

Minimum assertions:

- frontend API calls `GET /api/hades/bootstrap`
- hydration maps backend `messages`, `draft`, `minions`, and `assignments` into app state
- missing backend data keeps local starter defaults
- failed bootstrap leaves the local offline-safe state intact

## Required Backend Route

```txt
GET /api/hades/bootstrap
```

Response shape:

```ts
type HadesBootstrapResponse = {
  userId: string
  conversationId: string
  messages: ChatMessage[]
  draft: MinionDraft
  minions: Minion[]
  assignments: MinionAssignment[]
  socialLinks: SocialLink[]
  levelState: UserLevelState
  source: "memory" | "supabase"
}
```

## Railway Backend Rules

- Railway project root must be `backend/`.
- Railway start command must be `npm run start`.
- Railway config file must be `backend/railway.toml`.
- Railway env vars must include:
  - `NODE_ENV=production`
  - `PORT`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENROUTER_API_KEY`
  - `OPENROUTER_MODEL=deepseek/deepseek-v4-flash`
  - `CORS_ORIGIN=https://<vercel-domain>`
- Server secrets must never be copied into `frontend/`.

## Vercel Frontend Rules

- Vercel project root must be `frontend/`.
- Vercel build command must be `npm run build`.
- Vercel output directory must be `dist`.
- Vercel env vars must include:
  - `VITE_API_BASE_URL=https://<railway-backend-domain>`
- Vercel must not receive Supabase service role keys or private AI keys.

## Hosted Smoke Test

From the Vercel URL:

1. Open `/app/home`.
2. Send: `I want a command to send cat memes in Discord`.
3. Confirm assistant response appears.
4. Confirm draft card fills.
5. Test the draft.
6. Save the minion.
7. Assign it to Discord.
8. Refresh the page.
9. Confirm bootstrap restores saved minion and assignment.

## Do Not Start These Yet

```txt
real Discord deployment
real Telegram deployment
marketplace payments
creator payouts
multi-user auth
worker execution
```
