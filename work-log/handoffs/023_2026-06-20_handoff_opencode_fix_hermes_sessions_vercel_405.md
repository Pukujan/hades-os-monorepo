# Handoff #023 - OpenCode Fix Hermes Sessions Vercel 405

Date: 2026-06-20

Audience: OpenCode implementation agent

## Mission

Fix production Hermes session bootstrap from the Vercel frontend.

Observed browser failure:

```text
POST https://hades-os-monorepo.vercel.app/api/hades/hermes/sessions -> 405
[Hades chat] Hermes request failed.
Error: Hermes profile API server is not available yet.
```

This is a frontend deployment routing bug. The browser is posting Hermes media/session requests to the Vercel static frontend origin instead of the Railway backend API origin.

## Read First

```text
AGENTS.md
MEMORY.md
docs/hades/HERMES_MEDIA_FRONTEND_INTEGRATION.md
work-log/handoffs/022_2026-06-19_handoff_opencode_hades-hermes-media-frontend.md
docs/hermes-agent/user-guide/features/api-server.md
```

Hermes docs fact needed here:

- The browser should not call Hermes directly.
- Hades owns the edge route and injects profile `API_SERVER_KEY` server-side.
- Frontend calls must go to the Hades backend API origin.

## Root Cause

`frontend/src/modules/hades/services/hermesMediaClient.js` hardcodes:

```js
const HADES_API_BASE = "/api/hades/hermes";
```

Then it calls:

```js
fetch(`${HADES_API_BASE}/sessions`, ...)
```

In production, same-origin `/api/...` means Vercel:

```text
https://hades-os-monorepo.vercel.app/api/hades/hermes/sessions
```

Vercel serves the frontend only. It is not the Hades backend, so POST returns `405`.

The shared frontend API client already has the correct production behavior:

```text
frontend/src/shared/api/client.js
```

It uses `VITE_API_BASE_URL`, which should point at Railway:

```text
https://hades-os-monorepo-production.up.railway.app
```

Regular Hades API helpers already use this path. Hermes media/session helpers bypass it.

## Architecture Rule

Do not restore the old chat fallback.

Correct behavior:

- Frontend Hermes requests use `VITE_API_BASE_URL`.
- If Railway/Hades responds with `503`, show Hermes unavailable.
- If Vercel returns `405`, the frontend is still routing incorrectly.
- Do not call legacy `/api/hades/chat/general`.

## TDD Red Tests First

Added focused red frontend unit tests:

```text
frontend/src/modules/hades/tests/unit/hermesMediaClient.routing.test.js
```

Test cases:

1. `startHermesSession()` posts to `${VITE_API_BASE_URL}/api/hades/hermes/sessions` in production.
2. `uploadHermesMedia()` posts to `${VITE_API_BASE_URL}/api/hades/hermes/:profileName/media`.
3. `transcribeHermesAudio()` posts to `${VITE_API_BASE_URL}/api/hades/hermes/transcribe`.
4. `synthesizeHermesSpeech()` posts to `${VITE_API_BASE_URL}/api/hades/hermes/speak`.
5. `sendHermesResponse()` normalizes a relative session route like `/api/hades/hermes/profile/v1` to the Railway origin before appending `/responses`.
6. `sendHermesResponse()` leaves an absolute backend URL untouched.
7. Source assertion: `hermesMediaClient.js` must not hardcode same-origin `const HADES_API_BASE = "/api/hades/hermes"` without passing through `apiUrl()`.

Suggested test setup pattern:

```js
globalThis.importMetaEnvShim = {
  MODE: "production",
  VITE_API_BASE_URL: "https://railway.test"
};
```

Mock `global.fetch` and assert requested URLs.

For `transcribeHermesAudio`, mock `FileReader` or pass a small `Blob` in the jsdom/node test environment if supported by the existing frontend test hooks.

Run the new test and confirm it fails before implementation.

Command:

```bash
npm run test:hades-hermes-routing-ui
```

Expected current result before implementation:

```text
FAIL
```

Failure should show Hermes media/session requests using relative `/api/hades/hermes/...` instead of `${VITE_API_BASE_URL}/api/hades/hermes/...`.

Observed red result when added:

```text
tests 7
pass 1
fail 6
```

Failing assertions:

- `startHermesSession` used `/api/hades/hermes/sessions`.
- `uploadHermesMedia` used `/api/hades/hermes/tenant_user/media`.
- `transcribeHermesAudio` used `/api/hades/hermes/transcribe`.
- `synthesizeHermesSpeech` used `/api/hades/hermes/speak`.
- `sendHermesResponse` used `/api/hades/hermes/tenant_user/v1/responses`.
- Source assertion found no `apiUrl` usage and found the hardcoded same-origin base.

## Implementation Plan

Update:

```text
frontend/src/modules/hades/services/hermesMediaClient.js
```

Import shared URL helper:

```js
import { apiUrl } from "../../../shared/api/client.js";
```

Replace hardcoded same-origin base with a path constant:

```js
const HADES_HERMES_PATH = "/api/hades/hermes";
```

Add URL normalization:

```js
function backendUrl(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return apiUrl(pathOrUrl);
}
```

Use it everywhere:

```js
fetch(backendUrl(`${HADES_HERMES_PATH}/sessions`), ...)
fetch(backendUrl(`${HADES_HERMES_PATH}/${profileName}/media`), ...)
fetch(backendUrl(`${HADES_HERMES_PATH}/transcribe`), ...)
fetch(backendUrl(`${HADES_HERMES_PATH}/speak`), ...)
```

For `sendHermesResponse()`:

```js
const responsePath = hermesApiBaseUrl.endsWith("/v1")
  ? `${hermesApiBaseUrl}/responses`
  : hermesApiBaseUrl;
const url = backendUrl(responsePath);
```

This handles both backend response shapes:

```text
/api/hades/hermes/:profileName/v1
https://hades-os-monorepo-production.up.railway.app/api/hades/hermes/:profileName/v1
```

Keep auth behavior:

```js
authorization: `Bearer ${accessToken}`
```

Do not expose `API_SERVER_KEY`.

## Deploy Env Checks

Verify Vercel project env:

```text
VITE_API_BASE_URL=https://hades-os-monorepo-production.up.railway.app
```

No trailing slash.

Make sure it is set for:

- Production
- Preview, if testing preview deploys

After changing Vercel env, redeploy the frontend. Vite bakes `VITE_*` env vars at build time.

Verify Railway backend env:

```text
CORS_ORIGIN=https://hades-os-monorepo.vercel.app
APP_URL=https://hades-os-monorepo.vercel.app
HERMES_PUBLIC_BASE_URL=https://hades-os-monorepo-production.up.railway.app/api/hades/hermes
```

`HERMES_PUBLIC_BASE_URL` may be optional if the backend computes origin correctly, but setting it explicitly removes ambiguity.

## Validation Commands

Run:

```bash
npm --prefix frontend run test -- src/modules/hades/tests/unit/hermesMediaClient.routing.test.js
npm run test:hades-hermes-routing-ui
npm run test:hades-hermes-media-red
npm --prefix frontend run build
```

If frontend test script does not accept file args, run:

```bash
cd frontend
node --import ./test-hooks/register.mjs --test src/modules/hades/tests/unit/hermesMediaClient.routing.test.js
```

Optional backend sanity:

```bash
npm --prefix backend run test:hades-hermes-peer-model
node --test backend/src/modules/hades/tests/unit/hermesProfileGatewayProcessManager.test.js
```

## Manual Production Verification

After deploy, open browser DevTools Network tab and send a message in Hermes chat.

Expected request:

```text
POST https://hades-os-monorepo-production.up.railway.app/api/hades/hermes/sessions
```

Not:

```text
POST https://hades-os-monorepo.vercel.app/api/hades/hermes/sessions
```

Expected outcomes:

- `200`: session bootstrap succeeded.
- `401`: auth token issue.
- `503`: backend reached but Hermes profile gateway/process is not healthy.
- `405` from Vercel: routing bug not fixed.

If the request reaches Railway and returns `503`, inspect Railway logs for profile gateway launch:

```text
[Hades Hermes] starting profile gateway
```

Then debug `hermes -p <profileName> gateway` vs `hermes -p <profileName> gateway start` command shape in `createHermesProfileGatewayProcessManager`.

## Do Not Do

- Do not add Vercel serverless functions for Hades routes.
- Do not route browser directly to Hermes profile API ports.
- Do not put `API_SERVER_KEY`, `GROQ_API_KEY`, or `OPENROUTER_API_KEY` in Vercel/frontend env.
- Do not restore legacy `/api/hades/chat/general` fallback.
- Do not mask this with fake success responses.

## Completion Report Required

Report:

- Test added and initial red result.
- Files changed.
- Final test results.
- Vercel env status.
- Whether production request now targets Railway.
- If still failing, exact Railway status and log excerpt.
