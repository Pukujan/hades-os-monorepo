# Handoff #016 - Instagram Connect Link Uses Real Composio Redirect

Date: 2026-06-17

## Goal

Fix the Instagram Socials connect flow so the browser never opens a fake DNS-only placeholder domain.

## What Changed

- `backend/src/modules/hades/services/hades.service.js`
  - `createInstagramAuthLink()` now calls Composio's real hosted Connect Link endpoint:
    - `POST https://backend.composio.dev/api/v3.1/connected_accounts/link`
  - It uses:
    - `COMPOSIO_API_KEY`
    - `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID`
    - `APP_URL` or `CORS_ORIGIN` for callback URL fallback
  - It throws a clear `501` when Instagram connect is not configured instead of returning a fake URL.

- `backend/src/modules/hades/tests/unit/instagramAuthLink.service.test.js`
  - Added regression coverage for:
    - real Composio connect-link creation
    - fail-closed behavior when config is missing

- `backend/src/modules/hades/tests/unit/instagramSocialRoutes.tdd.test.js`
  - Removed the placeholder `composio.example` stub from the route contract test data.

## New Behavior

- Instagram connect returns a real `redirect_url` from Composio when configured.
- The browser no longer receives `https://composio.example/...`.
- If configuration is missing, the UI gets a clear backend error instead of a DNS failure.

## Required Env

Set these in the backend runtime:

```bash
COMPOSIO_API_KEY=...
COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID=...
APP_URL=https://your-frontend-domain
```

`CORS_ORIGIN` can be used as a fallback for callback URL resolution when `APP_URL` is absent.

## Tests

Run the focused contract checks:

```bash
node --test backend/src/modules/hades/tests/unit/instagramAuthLink.service.test.js
node --test backend/src/modules/hades/tests/unit/instagramSocialRoutes.tdd.test.js
```

Both pass.

