# OpenCode Handoff Contract: Wire Multi-User Auth Isolation Into Live Hades App

## Objective

The previous phase created auth/isolation building blocks and tests.

Current status:

```txt
Tests/building blocks exist.
Live app wiring is not complete.
```

This phase must wire the existing auth isolation system into the actual running Hades app so two different logged-in users can use Hades without seeing or modifying each other's data.

## Non-Negotiable Contract

Do not redesign the architecture.

Do not replace the existing Hades flow.

Do not change product concepts.

Do not make Hermes own auth, tenant boundaries, or persistent user memory.

Use the existing architecture:

```txt
Hades = app/session/data boundary
Hermes = shared runtime/agent executor
Minions = user-facing agents
Socials = trigger surfaces
MCP/skills/tools = capabilities Hermes may call
```

Core rule:

```txt
Hermes is shared.
User context is not shared.
```

## Required Outcome

After this phase:

```txt
User A logs in → sees only User A Hades data
User B logs in → sees only User B Hades data
User A cannot read/update/delete User B data
User A trigger cannot execute User B minion
User A Hermes prompt/context cannot include User B memory
Telegram/Discord connections are scoped to the owning user
Execution logs are scoped to the owning user
```

## What Must Be Wired

### 1. Real Routes Must Call Auth

Wire `requireHadesAuth()` into all protected Hades routes.

Protected routes include at minimum:

```txt
GET    /api/hades/bootstrap
POST   /api/hades/chat
POST   /api/hades/assignments
GET    /api/hades/conversations/:id/messages
DELETE /api/hades/conversations/:id/messages
GET    /api/hades/socials
POST   /api/hades/socials/telegram/token
```

### 2. Replace Use of Legacy Repository

The live app must stop using the old non-scoped `hades.repository.js` for user-owned data.

Use scoped repositories for:

```txt
minions
assignments
conversations
messages
discord_connections
telegram_connections
agent_executions
memory/context
```

### 3. Wire `verifySocialAccount`

`hades/index.js` must not have `verifySocialAccount: null`.

Wire the real `createVerifySocialAccount()` into the runtime.

### 4. Wire Runtime Dependencies

`minionAssignmentRuntime` must receive real dependencies.

Add an assertion or fail-fast guard if required dependencies are missing.

### 5-9. Scope bootstrap, chat, assignments, triggers, Telegram tokens

### 10. Frontend State Safety

Frontend must clear/reload user-scoped Hades state on logout/account switch.

## Required RED Tests Before Implementation

Write the wiring tests first (8 test files, vitest/playwright-style, converted to node:test).

## Acceptance Criteria

- Existing 247 tests still pass
- New wiring tests pass
- Protected Hades routes call auth
- Live app uses scoped repos
- verifySocialAccount is wired
- runtime deps are not null
- bootstrap/chat/assignments are scoped
- triggers are scoped by verified social account
- Telegram token storage is scoped and secret-safe
- Two different accounts can log in and see only their own Hades data
