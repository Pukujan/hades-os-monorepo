# Handoff: Hosted Hermes + Private AI Integration

## Purpose

Move Hades OS from a local prototype into a hosted MVP with real backend persistence and an AI-backed Hermes flow.

This handoff starts after the React prototype conversion. The UI should remain prototype-preserving, but the chat, draft, test, save, and assign loop should begin moving from local-only state toward real services.

## Current State

- Frontend: React/Vite app in `frontend/`.
- Backend: Node API scaffold in `backend/`.
- Deployment contract: Railway hosts `backend/`, Vercel hosts `frontend/`.
- Existing UI flow: chat -> draft -> test -> save -> assign.
- Existing persistence: mostly `localStorage`.
- Existing Hermes behavior: local parser + simulated responses.
- Existing social behavior: assignment placeholders only.

## Read First

```txt
docs/DEPLOY.md
docs/architecture/contracts/monorepoDeploy.contract.md
docs/hades-mvp-handoff/hades-mvp-codex-handoff/implementation/codex-implementation-handoff.md
docs/hades-mvp-handoff/hades-mvp-codex-handoff/docs/data-model.md
docs/hades-mvp-handoff/hades-mvp-codex-handoff/docs/bot-creator-chat-pattern.md
docs/hades-mvp-handoff/hades-mvp-codex-handoff/implementation/test-checklist.md
docs/hades-ui-qa-issue-draft.md
```

## Goal

Create a hosted MVP where:

```txt
Vercel frontend
-> Railway backend
-> Hermes service layer
-> private AI server
-> Supabase persistence
```

The first production slice should make the existing app feel the same to the user, while replacing local-only Hermes simulation with a real API path that can be deployed.

## Product Rules

- Preserve the current prototype UI and mobile app shell.
- Keep social deployment as preview-only unless separately authorized.
- Keep the existing local parser as a fallback path.
- Do not expose private AI server secrets to the browser.
- Do not call the private AI server directly from Vercel/client code.
- Keep test/save/assign actions idempotent enough for repeated mobile taps.
- Treat Supabase as persistence for MVP entities, not as the reasoning engine.

## Target Architecture

```txt
frontend/
  React app deployed to Vercel
  Reads VITE_API_BASE_URL
  Calls backend routes only

backend/
  Node API deployed to Railway
  Owns server secrets
  Calls Supabase with service credentials when needed
  Calls private AI server through Hermes adapter

Supabase
  Stores users, conversations, messages, minions, socials, assignments, test runs

Private AI server
  Receives normalized Hermes requests from backend only
  Returns structured draft updates and assistant copy
```

## First Implementation Slice

Build the narrowest real hosted loop:

```txt
1. User sends chat message from Home
2. Frontend POSTs to backend `/api/hades/chat`
3. Backend persists user message
4. Backend calls Hermes adapter
5. Hermes adapter calls private AI server if configured
6. Backend validates/normalizes returned draft
7. Backend persists assistant message + draft snapshot
8. Frontend renders assistant response and draft
9. User tests, saves, and assigns through backend routes
```

If `PRIVATE_AI_BASE_URL` is missing, backend should use the existing local parser/fallback behavior so development still works.

## Backend Routes

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

Runs a simulated MVP test first. Later this can call worker infrastructure.

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

Persists a tested or ready draft as an active minion.

### `POST /api/hades/assignments`

Persists minion assignment to a social placeholder.

## Hermes Adapter Contract

Backend module suggestion:

```txt
backend/src/modules/hades/hermes.service.js
backend/src/modules/hades/privateAiClient.js
backend/src/modules/hades/hades.routes.js
backend/src/modules/hades/hades.repository.js
```

Hermes request to private AI server:

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

Hermes response from private AI server:

```ts
type HermesPrivateAiResponse = {
  assistantText: string
  draftPatch: Partial<MinionDraft>
  missingFields: string[]
  suggestions: string[]
  confidence?: number
}
```

Validation rules:

- Reject unknown `targetSocial`, `triggerType`, and `category` values.
- Sanitize assistant text before rendering in the chat bubble.
- Coerce missing required fields into `missingFields`.
- Never allow private AI response to directly create deployments, repos, PRs, or social posts.

## Supabase MVP Tables

Start with the existing handoff data shapes:

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

Minimum columns should map to the existing types in:

```txt
docs/hades-mvp-handoff/hades-mvp-codex-handoff/docs/data-model.md
```

Recommended MVP simplification:

- Use a local/dev `userId` until auth is chosen.
- Store `draft_snapshot` as JSON on `conversations` or `chat_messages`.
- Add `idempotency_key` to write-heavy tables.

## Environment Variables

Frontend on Vercel:

```txt
VITE_API_BASE_URL=https://<railway-api-domain>
```

Backend on Railway:

```txt
NODE_ENV=production
PORT=<railway provided>
SUPABASE_URL=<supabase project url>
SUPABASE_SERVICE_ROLE_KEY=<server only>
SUPABASE_ANON_KEY=<optional if needed>
PRIVATE_AI_BASE_URL=<private ai server origin>
PRIVATE_AI_API_KEY=<server only>
HERMES_MODE=private_ai_with_fallback
CORS_ORIGIN=https://<vercel-domain>
```

Do not put `SUPABASE_SERVICE_ROLE_KEY`, `PRIVATE_AI_API_KEY`, or private AI host credentials in the frontend.

## Frontend Changes

Add a small API client around `VITE_API_BASE_URL`.

Suggested files:

```txt
frontend/src/modules/hades/hadesApi.js
frontend/src/modules/hades/HadesApp.jsx
frontend/src/modules/hades/parser.js
```

Rules:

- Keep `parser.js` as fallback/testable local logic.
- Use backend responses when available.
- Preserve pending/offline message states.
- If backend fails, show a friendly failed state and allow retry.
- Do not redesign the UI while wiring APIs.

## Deployment Plan

1. Verify local tests and build:

```bash
npm test --prefix frontend
npm run build --prefix frontend
npm run lint:deploy
```

2. Deploy backend to Railway from `backend/`.
3. Set Railway env vars.
4. Confirm `/api/health` or equivalent health route.
5. Deploy frontend to Vercel from `frontend/`.
6. Set `VITE_API_BASE_URL`.
7. Run hosted smoke test:

```txt
Open Vercel URL
Send minion prompt
Confirm backend response source
Test draft
Save minion
Assign to Discord placeholder
Refresh page
Confirm persisted state returns
```

## Acceptance Criteria

- Hosted frontend loads from Vercel.
- Hosted backend loads from Railway.
- Frontend never calls private AI server directly.
- Chat route works with private AI when env vars exist.
- Chat route falls back locally when private AI env vars are missing.
- Supabase stores chat messages, minions, test runs, and assignments.
- Refreshing the app does not lose saved minions or assignments.
- Existing local parser tests still pass.
- Existing prototype UI remains intact.

## Non-Goals For This Handoff

```txt
real Discord bot deployment
real Telegram bot deployment
marketplace payments
creator payouts
worker execution
automatic PR creation
multi-user billing
public prompt marketplace
```

## Known Follow-Up Issue

UI polish remains tracked separately:

```txt
docs/hades-ui-qa-issue-draft.md
```

This should not block hosting/integration unless the app becomes unreadable on the default Ember Forge theme.

## Completion Report Format

When implementing, report completion by slice:

```txt
1. Route/API added
2. Supabase table or repository added
3. Frontend caller wired
4. Local fallback verified
5. Hosted env var documented
6. Test/build/deploy proof
7. Known placeholder status
```
