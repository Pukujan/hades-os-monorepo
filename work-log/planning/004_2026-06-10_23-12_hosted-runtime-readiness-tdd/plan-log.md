# Plan Log: Hosted Runtime Readiness TDD

## Goal

Make the Hades OS MVP ready for Railway backend hosting and Vercel frontend hosting through a test-first runtime readiness phase.

This phase does not deploy the app directly. It creates the tests, routes, checks, and smoke script needed to deploy with confidence.

## Build Order

1. Add backend config tests for OpenRouter and Supabase env handling.
2. Add backend readiness route tests.
3. Add Supabase readback tests for MVP entities.
4. Add smoke script tests.
5. Implement readiness helpers and route.
6. Implement missing Supabase readback behavior.
7. Implement `npm run smoke:hades`.
8. Update deploy docs with the smoke command.
9. Run full validation.

## Files Expected To Change

```txt
backend/src/modules/hades/config/index.js
backend/src/modules/hades/routes/hades.routes.js
backend/src/modules/hades/services/hades.service.js
backend/src/modules/hades/repositories/hades.repository.js
backend/src/modules/hades/tests/unit/hades.config.test.js
backend/src/modules/hades/tests/integration/hades.readiness.routes.test.js
backend/src/modules/hades/tests/unit/hades.supabase.readback.test.js
frontend/src/shared/api/client.test.js
frontend/src/modules/hades/hadesHostedApi.test.js
scripts/smoke-hades-runtime.mjs
scripts/smoke-hades-runtime.test.mjs
package.json
docs/DEPLOY.md
```

## Test Gates

```bash
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run build
npm run lint:deploy
npm run test:deploy
npm run smoke:hades
```

## MVP To-Do After This Phase

1. Deploy backend from `backend/` to Railway.
2. Set Railway env vars from `backend/.env.example`.
3. Deploy frontend from `frontend/` to Vercel.
4. Set Vercel `VITE_API_BASE_URL` to the Railway backend URL.
5. Run hosted smoke test.
6. Document Railway and Vercel URLs.
7. Decide whether MVP launch needs auth before wider testing.
8. Keep Discord, Telegram, marketplace, payments, and worker execution locked as previews.

## Definition Of Done

The phase is complete when tests prove the hosted runtime contract, server-only secrets are not exposed, the app can verify its own backend readiness, and the minion create-test-save-assign loop can be smoke-tested from a single command.
