# Handoff: Backend-Hostable Hades MVP

## Purpose

Turn the current prototype-preserving React app into a backend-hostable MVP that can run with a real deployment path:

```txt
Vercel frontend
-> Railway backend
-> Hermes service layer
-> private AI server
-> Supabase persistence
```

This handoff is intentionally narrower than the earlier hosted integration note. It is the execution brief for the next implementation pass.

## Current State

- Frontend UI is already converted to React and preserves the prototype layout.
- Mobile shell and bottom navigation are in place.
- Theme switching already supports Ember Forge plus pastel/professional variants.
- Frontend still relies heavily on local state and simulated Hermes behavior.
- Backend only has the scaffold and generic module examples; there is no Hades-specific API module yet.

## What We Are Building Next

The next pass should make the app hostable without changing the visual direction:

1. Add a backend Hades module with real routes.
2. Move chat, draft, test, save, and assign operations behind the backend.
3. Keep local parser logic as a fallback when private AI is unavailable.
4. Persist MVP data in Supabase-friendly repositories.
5. Prepare the app for Railway backend + Vercel frontend deployment.

## Read First

```txt
docs/DEPLOY.md
docs/hades-mvp-handoff/hades-mvp-codex-handoff/README.md
docs/hades-mvp-handoff/hades-mvp-codex-handoff/docs/data-model.md
docs/hades-mvp-handoff/hades-mvp-codex-handoff/docs/route-map.md
docs/hades-mvp-handoff/hades-mvp-codex-handoff/implementation/codex-implementation-handoff.md
docs/hades-mvp-handoff/hades-mvp-codex-handoff/implementation/component-breakdown.md
docs/hades-ui-qa-issue-draft.md
work-log/handoffs/001_2026-06-10_01-10_handoff_hosted-hermes-private-ai.md
```

## Primary Goal

Implement a hosted MVP where the frontend can talk to a deployable backend that owns secrets and persistence:

```txt
Frontend -> backend API -> Hermes adapter -> private AI server or local fallback -> Supabase
```

The user-facing app should still feel like the prototype:

- same mobile-first shell
- same bottom navigation
- same chat -> draft -> test -> save -> assign flow
- same locked future previews
- same Ember Forge default theme

## First Slice To Implement

Build the smallest real vertical slice first:

1. `GET /api/health`
2. `POST /api/hades/chat`
3. `POST /api/hades/minions/test`
4. `POST /api/hades/minions`
5. `POST /api/hades/assignments`

That first slice should:

- accept a chat message from the frontend
- persist or emulate persistence in a server-backed repository
- call Hermes on the backend
- fall back to local parser logic if private AI is not configured
- return a normalized draft and assistant response
- let the UI test, save, and assign through backend calls

## Test-Driven Development Contract

This pass must be test-driven. Add the failing tests first, confirm they fail for the expected missing behavior, then implement the smallest production code needed to make them pass.

Use the existing Node test runner style already present in the repo. Follow the current module layout:

```txt
backend/src/modules/_reference/tests/
backend/src/modules/model-condenser/tests/
frontend/src/modules/hades/*.test.js
```

### Required Test Files

Create these before implementing the Hades backend module:

```txt
backend/src/modules/hades/tests/integration/hades.routes.test.js
backend/src/modules/hades/tests/unit/hermes.service.test.js
backend/src/modules/hades/tests/unit/hades.repository.test.js
backend/src/modules/hades/tests/unit/hades.schema.test.js
frontend/src/modules/hades/hadesApi.test.js
```

### Route Tests

`backend/src/modules/hades/tests/integration/hades.routes.test.js`

Cover:

- `GET /api/health` still returns `{ status: "ok" }`
- `POST /api/hades/chat` accepts a valid message and returns `conversationId`, `userMessage`, `assistantMessage`, `draft`, `missingFields`, `suggestions`, and `source`
- `POST /api/hades/chat` returns `source: "local_fallback"` when private AI env vars are absent
- `POST /api/hades/minions/test` rejects incomplete drafts
- `POST /api/hades/minions/test` returns a stable simulated test run for a complete draft
- `POST /api/hades/minions` saves a valid ready or tested draft
- `POST /api/hades/assignments` saves a minion assignment to a placeholder social
- repeated requests with the same `idempotencyKey` do not create duplicate saved minions, assignments, messages, or test runs

### Hermes Service Tests

`backend/src/modules/hades/tests/unit/hermes.service.test.js`

Cover:

- calls private AI client when `PRIVATE_AI_BASE_URL` and `PRIVATE_AI_API_KEY` are configured
- falls back to local parser when private AI config is missing
- falls back to local parser when private AI throws a recoverable network/service error
- merges `draftPatch` into `currentDraft` without losing existing valid fields
- rejects unsafe or unknown `category`, `triggerType`, and `targetSocial` values
- strips or escapes assistant HTML before it reaches the route response
- never returns an instruction that deploys to a social platform or creates external side effects

### Repository Tests

`backend/src/modules/hades/tests/unit/hades.repository.test.js`

Cover:

- creates or reuses a conversation for a local MVP user
- stores user and assistant messages in order
- stores draft snapshots as plain JSON
- saves minions with stable IDs and timestamps
- saves social assignments with stable IDs and timestamps
- saves test runs with input, output, status, and draft snapshot
- enforces idempotency for write-heavy methods
- exposes an in-memory adapter so local tests can pass without Supabase credentials

### Schema Tests

`backend/src/modules/hades/tests/unit/hades.schema.test.js`

Cover:

- valid chat request passes
- empty message fails
- missing `idempotencyKey` fails on write routes
- unknown `targetSocial` fails
- unknown `triggerType` fails
- unknown `category` fails
- valid complete draft passes
- incomplete draft reports missing fields in deterministic order

### Frontend API Tests

`frontend/src/modules/hades/hadesApi.test.js`

Cover:

- chat API posts to `/api/hades/chat` with `clientMessageId`, `idempotencyKey`, message text, and current draft
- minion test API posts to `/api/hades/minions/test`
- save API posts to `/api/hades/minions`
- assignment API posts to `/api/hades/assignments`
- API wrapper preserves backend error messages for UI fallback states
- local parser remains available as a development fallback when backend calls fail

### Red-Green Rule

For each feature:

1. Add or update the failing test.
2. Run the narrow test file and confirm the expected failure.
3. Implement the smallest production change.
4. Re-run the narrow test file.
5. Re-run the related package suite before moving to the next route or service.

## Backend Module Shape

Suggested files:

```txt
backend/src/modules/hades/index.js
backend/src/modules/hades/routes/hades.routes.js
backend/src/modules/hades/services/hermes.service.js
backend/src/modules/hades/services/privateAiClient.js
backend/src/modules/hades/services/hades.service.js
backend/src/modules/hades/repositories/hades.repository.js
backend/src/modules/hades/schemas/hades.schema.js
backend/src/modules/hades/config/index.js
```

Design rules:

- Keep business logic inside the backend.
- Do not let the browser call private AI directly.
- Do not let the browser see service keys.
- Keep the parser fallback deterministic and testable.
- Make repeated taps safe with idempotency keys.

## Route Contract

### `POST /api/hades/chat`

Request:

```ts
type HadesChatRequest = {
  conversationId?: string
  clientMessageId: string
  idempotencyKey: string
  message: string
  currentDraft?: MinionDraft
}
```

Response:

```ts
type HadesChatResponse = {
  conversationId: string
  userMessage: ChatMessage
  assistantMessage: ChatMessage
  draft: MinionDraft
  missingFields: string[]
  suggestions: string[]
  source: "private_ai" | "local_fallback"
}
```

### `POST /api/hades/minions/test`

Request:

```ts
type TestMinionRequest = {
  draft: MinionDraft
  testInput?: string
  idempotencyKey: string
}
```

Response:

```ts
type TestMinionResponse = {
  testRun: MinionTestRun
  draft: MinionDraft
}
```

### `POST /api/hades/minions`

Persist a ready or tested draft as an active minion.

### `POST /api/hades/assignments`

Persist a minion assignment to a social placeholder or live social record.

## Hermes Rules

Hermes should normalize requests before they leave the backend.

Private AI request:

```ts
type HermesPrivateAiRequest = {
  userId: string
  conversationId: string
  message: string
  currentDraft: MinionDraft
  allowedProviders: ["discord", "telegram", "email", "github", "private"]
  mode: "minion_draft"
}
```

Private AI response:

```ts
type HermesPrivateAiResponse = {
  assistantText: string
  draftPatch: Partial<MinionDraft>
  missingFields: string[]
  suggestions: string[]
  confidence?: number
}
```

Validation requirements:

- Reject unknown `category`, `triggerType`, or `targetSocial` values.
- Sanitize assistant text before rendering in the UI.
- Do not permit the AI response to create deployments, repos, or social posts.
- Fall back to the local parser when private AI env vars are missing.

## Persistence Targets

Supabase tables should be aligned to the existing MVP model:

```txt
users
conversations
chat_messages
minions
social_links
minion_assignments
minion_test_runs
user_level_state
```

Suggested MVP simplification:

- Use a local `userId` until auth is chosen.
- Store `draft_snapshot` as JSON where convenient.
- Add `idempotency_key` to write-heavy tables.
- Make repositories return plain JS objects so the frontend can consume them cleanly.

## Frontend Wiring

The frontend already has a shared API helper at:

```txt
frontend/src/shared/api/client.js
```

Use that or a Hades-specific wrapper to replace the local-only flow:

- send chat messages to the backend
- update the draft from backend responses
- keep optimistic UI states for queued messages
- show friendly fallback states if the backend is offline
- keep the UI and card hierarchy unchanged

## Environment Variables

Frontend:

```txt
VITE_API_BASE_URL=https://<railway-api-domain>
```

Backend:

```txt
NODE_ENV=production
PORT=<railway provided>
SUPABASE_URL=<supabase project url>
SUPABASE_SERVICE_ROLE_KEY=<server only>
SUPABASE_ANON_KEY=<optional>
PRIVATE_AI_BASE_URL=<private ai server origin>
PRIVATE_AI_API_KEY=<server only>
HERMES_MODE=private_ai_with_fallback
CORS_ORIGIN=https://<vercel-domain>
```

## Verification Plan

Before handing the slice off again, verify:

1. Narrow backend route tests pass.
2. Narrow Hermes, schema, and repository unit tests pass.
3. Frontend Hades API tests pass.
4. Full backend test suite passes.
5. Full frontend test suite passes.
6. Frontend production build passes.
7. Hosted smoke test covers send message, receive draft update, test draft, save minion, assign minion, refresh, and confirm persistence.

## Acceptance Criteria

- Backend can run on Railway with health check.
- Frontend can target the backend through `VITE_API_BASE_URL`.
- Chat works with private AI when configured.
- Chat falls back to local parser behavior when private AI is missing.
- Save and assign flows are backend-driven.
- Existing prototype UI remains visually intact.
- Mobile shell still keeps the bottom nav fixed.

## Non-Goals

```txt
real Discord bot deployment
real Telegram bot deployment
marketplace payments
creator payouts
worker execution
automatic PR creation
public prompt marketplace
multi-user billing
```

## Recommended Execution Order For 5.4 Mini

1. Add the required failing backend tests.
2. Add the required failing frontend API tests.
3. Implement backend Hades module skeleton.
4. Implement schema validation.
5. Implement in-memory repository and idempotency behavior.
6. Implement Hermes/private AI adapter with local fallback.
7. Implement Hades routes.
8. Wire frontend API calls while preserving local fallback behavior.
9. Add Supabase repository adapter after in-memory behavior is green.
10. Run full test/build verification.
11. Run hosted smoke test.
