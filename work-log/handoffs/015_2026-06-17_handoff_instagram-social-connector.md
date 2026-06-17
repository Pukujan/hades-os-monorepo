# Handoff #015 - Instagram Social Connector for Hermes/Hades

Date: 2026-06-17

## Goal

Add Instagram as a first-class Socials UI connector and authenticated backend route set so Hades/Hermes can support Instagram DM workflows per user.

The target is not blind automation. The default mode must be human-in-the-loop:

- Read inbound DM events.
- Let Hermes draft replies.
- Require approval before sending unless the user explicitly configures a safer narrower automation later.
- Keep every connection scoped to the authenticated user and tenant.

## Research Summary

Recommended first path: Composio Instagram connector.

Why:

- Composio advertises Instagram MCP/direct API support with OAuth2, managed auth, token refresh, scoped access, and per-user credentials.
- Its Instagram toolkit lists DM-oriented tools including conversation lookup, listing conversations/messages, marking seen, and sending text/image messages.
- This matches our app model because Hades can store a per-user external connection ID while the actual Instagram OAuth/token complexity is handled by a connector.

Lower-level fallback: Meta Instagram Messaging API.

Why:

- Meta's official API is the canonical route for Instagram Professional accounts and messaging.
- It has stricter account/app requirements and operational rules, so it should be treated as a direct provider adapter after the Composio route is stable.

Postiz role:

- Useful for Instagram publishing/scheduling workflows.
- Not the primary DM connector for this handoff unless their API/agent surface proves DM receive/send support in our tests.

## New TDD Commands

Run all Instagram connector contracts:

```bash
npm run test:hades-instagram-social
```

Backend only:

```bash
npm --prefix backend run test:hades-instagram-social
```

Frontend only:

```bash
npm --prefix frontend run test:hades-instagram-social-ui
```

## New Tests

Backend:

```text
backend/src/modules/hades/tests/unit/instagramSocialRoutes.tdd.test.js
```

Frontend:

```text
frontend/src/modules/hades/tests/unit/instagramSocial.tdd.test.js
```

Scripts:

- Root `package.json`: `test:hades-instagram-social`
- Backend `package.json`: `test:hades-instagram-social`
- Frontend `package.json`: `test:hades-instagram-social-ui`

## Observed Initial Red State

Run on 2026-06-17:

```bash
npm run test:hades-instagram-social
```

Backend:

```text
0 pass, 4 fail
```

Failures are expected because all required routes currently return `404`:

- `POST /api/hades/socials/instagram/connect`
- `POST /api/hades/socials/instagram/connection`
- `DELETE /api/hades/socials/instagram/connection`
- `POST /api/hades/triggers/instagram`

Frontend was run separately because the root command stops after backend failure:

```bash
npm --prefix frontend run test:hades-instagram-social-ui
```

Frontend:

```text
0 pass, 4 fail
```

Failures are expected because:

- `SOCIAL_LINKS` does not include Instagram.
- `hadesApi.js` does not export Instagram lifecycle helpers.
- The lifecycle helper calls do not exist yet.
- `HadesPrototypeApp.jsx` does not import/render `InstagramSetupCard`.

## Backend Contract

Add authenticated routes:

```text
POST   /api/hades/socials/instagram/connect
POST   /api/hades/socials/instagram/connection
DELETE /api/hades/socials/instagram/connection
```

Add external event route:

```text
POST /api/hades/triggers/instagram
```

### Route Behavior

`POST /socials/instagram/connect`

- Requires Hades auth.
- Calls `service.createInstagramAuthLink(body, req.authContext)`.
- Ignores any `userId`/`tenantId` in body for ownership.
- Returns:

```js
{
  provider: "instagram",
  connector: "composio",
  authUrl,
  connectionIntentId
}
```

`POST /socials/instagram/connection`

- Requires Hades auth.
- Calls `service.saveInstagramConnection(body, req.authContext)`.
- Stores only external connector metadata, not raw Instagram tokens.
- Returns public connection state:

```js
{
  provider: "instagram",
  status: "connected",
  handle,
  connector: "composio"
}
```

`DELETE /socials/instagram/connection`

- Requires Hades auth.
- Calls `service.deleteInstagramConnection(req.authContext)`.
- Disconnects only the authenticated user's connection.

`POST /triggers/instagram`

- Accepts signed connector events from Composio/Meta.
- Verifies connector/webhook signature before processing.
- Resolves the owning user/tenant from the stored Instagram connection, never from the request body.
- Queues Hermes/minion handling for inbound DM events.

## Repository Contract

Add `instagramConnections` scoped repo with methods similar to Telegram/Discord/GitHub:

```js
createOrUpdate({
  userId,
  tenantId,
  connector,
  externalConnectionId,
  instagramBusinessAccountId,
  handle,
  status,
  capabilities,
})

findPublicByUser({ userId, tenantId })
findRuntimeByExternalConnectionId({ externalConnectionId })
delete({ userId, tenantId })
```

Storage rules:

- Per-user and per-tenant.
- No raw Instagram OAuth token returned to frontend.
- If Composio is used, store external connection/session IDs and public account metadata.
- If direct Meta is used later, encrypt access tokens using the same secret-storage pattern as existing social tokens.

## Frontend Contract

Add Instagram to:

```text
frontend/src/modules/hades/utils/hadesData.js
```

Expected:

```js
{
  id: "instagram",
  provider: "instagram",
  displayName: "Instagram",
  status: "not_connected",
  commandName: null
}
```

Update:

```text
frontend/src/modules/hades/services/hadesApi.js
```

Export:

```js
createInstagramAuthLink(payload, accessToken)
saveInstagramConnection(payload, accessToken)
deleteInstagramConnection(accessToken)
```

Create:

```text
frontend/src/modules/hades/components/InstagramSetupCard.jsx
```

Socials UI must render it with:

- Connect Instagram button.
- Connector label, default `Composio`.
- Status/handle display.
- Disconnect button.
- Copy explaining that Instagram DM sends require approval by default.

## Hermes/Minion Runtime Contract

Add Instagram as a supported target social for workflows/minions, but keep guardrails:

- DM send actions require approval by default.
- Inbound DM event creates a scoped conversation context.
- Hermes sees only the authenticated user's Instagram connection metadata.
- No cross-user context leakage.
- Audit outbound messages with provider, connection ID, Instagram conversation ID, user ID, tenant ID, approval state, and minion/workflow ID.

## Build Order

1. Add backend routes in `hades.routes.js`.
2. Add service methods in `hades.service.js`.
3. Add `instagramConnections` repository/adapter.
4. Add Composio provider adapter with auth-link creation and event verification.
5. Add frontend API methods.
6. Add Instagram to `SOCIAL_LINKS`, `formatSocialLabel`, and `getSocialIcon`.
7. Add `InstagramSetupCard`.
8. Wire `SocialsScreen` to fetch/render Instagram connection state.
9. Add Instagram minion target support with approval-required DM sends.
10. Run `npm run test:hades-instagram-social`.

## Acceptance Criteria

- Instagram appears in Socials UI.
- Clicking connect creates a per-user auth link through the backend.
- Saving a connection cannot be assigned to a body-supplied `userId` or `tenantId`.
- Listing socials includes only the authenticated user's Instagram state.
- Inbound Instagram webhook events map to stored connection ownership.
- Hermes/minion outbound DM actions require explicit approval by default.

## Sources Checked

- Composio Instagram toolkit: https://composio.dev/toolkits/instagram
- Meta Instagram Messaging API docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/
- Postiz Hermes Instagram page: https://postiz.com/hermes-agent/instagram
- Postiz agent GitHub: https://github.com/gitroomhq/postiz-agent
