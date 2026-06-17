# Handoff #014 - Extension API Production Routing and 405 Fix

Date: 2026-06-17

## Goal

Fix production extension API calls so Socials UI key generation/download uses the Railway backend origin, not the Vercel frontend origin.

User-reported production error:

```text
POST https://hades-os-monorepo.vercel.app/api/hades/extension/keys 405 (Method Not Allowed)
```

This means the browser is posting to Vercel same-origin `/api/hades/extension/keys`. Vercel is only serving the frontend for this app and is not the Hades backend API. The extension install API client must honor `VITE_API_BASE_URL`, same as the existing Hades chat API client.

## New TDD

Updated:

```text
frontend/src/modules/hades/tests/unit/extensionInstallModule.tdd.test.js
```

Run:

```bash
npm --prefix frontend run test:hades-extension-install-ui
```

This test now requires:

```text
POST https://hades-os-monorepo-production.up.railway.app/api/hades/extension/keys
```

instead of:

```text
POST /api/hades/extension/keys
POST https://hades-os-monorepo.vercel.app/api/hades/extension/keys
```

## Expected Initial Red State

The new production routing test should fail because:

Observed red run on 2026-06-17:

```text
npm --prefix frontend run test:hades-extension-install-ui
4 pass, 1 fail

Expected:
https://hades-os-monorepo-production.up.railway.app/api/hades/extension/keys

Actual:
/api/hades/extension/keys
```

```text
frontend/src/modules/hades/extension/services/extensionInstallApi.js
```

currently uses:

```js
const BASE_PATH = "/api/hades/extension";
fetch(`${BASE_PATH}${path}`, ...)
```

That hardcoded relative URL causes the deployed Vercel frontend to call Vercel's origin and receive `405 Method Not Allowed`.

## Required Fix

Update:

```text
frontend/src/modules/hades/extension/services/extensionInstallApi.js
```

to use the shared API URL/client logic:

```text
frontend/src/shared/api/client.js
```

Required behavior:

- In production, all extension install calls use `VITE_API_BASE_URL`.
- In development, relative `/api/...` remains allowed when `VITE_API_BASE_URL` is empty.
- Key lifecycle calls include auth headers through the shared client path.
- Download URL generation should also include the production backend origin when needed:

```js
buildExtensionDownloadUrl() === `${VITE_API_BASE_URL}/api/hades/extension/download`
```

or use a shared helper that resolves the absolute URL safely.

## Acceptance Commands

```bash
npm --prefix frontend run test:hades-extension-install-ui
npm run test:hades-extension-install
```

Then verify in production browser console:

```text
POST https://hades-os-monorepo-production.up.railway.app/api/hades/extension/keys
```

No request should be sent to:

```text
https://hades-os-monorepo.vercel.app/api/hades/extension/keys
```

## Notes

- This is not an encryption/scoping issue. The key repository/auth contracts already cover hashing/redaction and user scoping.
- This is a frontend deployment routing issue: the extension install API client bypasses the shared `VITE_API_BASE_URL` path.
- If Vercel environment variables are missing, keep the existing loud production failure behavior rather than silently falling back to same-origin `/api`.
