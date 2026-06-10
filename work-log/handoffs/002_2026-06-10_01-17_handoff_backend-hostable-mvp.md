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

## Test Plan

Before handing the slice off again, verify:

1. Backend unit tests for Hermes fallback and validation.
2. Backend route tests for `/api/hades/chat` and `/api/hades/minions/test`.
3. Frontend build passes.
4. Hosted smoke test covers:
   - send message
   - receive draft update
   - test draft
   - save minion
   - assign minion
   - refresh and confirm persistence

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

1. Add backend Hades module skeleton.
2. Add route + schema validation.
3. Add Hermes/private AI adapter with fallback.
4. Add repository layer and Supabase wiring.
5. Wire frontend API calls.
6. Add tests.
7. Verify hosted smoke test.

