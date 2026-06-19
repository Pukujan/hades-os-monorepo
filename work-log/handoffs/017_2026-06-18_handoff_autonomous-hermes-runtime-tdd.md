# Handoff #017 - Autonomous Hermes User Universe TDD

Date: 2026-06-18

## Goal

Implement the next Hades/Hermes runtime foundation using the revised architecture:

```text
Hermes = autonomous worker inside user-scoped HERMES_HOME
Hades = identity, tenant isolation, signed routing, capability envelope, approvals, audit, artifact publication
R2 = bulky Hermes state, memory, skills, sessions, logs, generated artifacts
Supabase = metadata index, auth scope, run records, approvals, hashes, object keys
```

This replaces the older idea that Hades should manually model every Hermes skill/tool. Hades should isolate and govern Hermes, not make Hermes smaller.

## Extra Notes For Opencode

Opencode models available in this environment may be weaker than the main model that wrote this plan. Be literal and follow the tests.

Recommended working style:

- Read the files listed in "Read First" before coding.
- Implement one red test group at a time.
- Keep `oneshot` behavior working while adding new modules.
- Prefer small in-memory implementations first where tests allow it.
- Do not attempt full daemon mode before workspace, R2 state, routing tokens, and boundary actions pass.
- Do not edit `AGENTS.md`; use the docs below instead.

## Read First

```text
docs/hermes/AGENT_CONTEXT.md
docs/hermes/upstream/hermes-docs.agent.json
work-log/study-docs/005_2026-06-18_study-log_autonomous-hermes-user-universe.md
work-log/planning/011_2026-06-18_autonomous-hermes-runtime/plan-log.md
backend/src/modules/hades/services/hermesRuntime.service.js
backend/src/modules/hades/services/telegramBotRuntime.service.js
backend/src/modules/hades/services/telegramClient.js
```

Use the upstream full docs only when needed:

```text
docs/hermes/upstream/llms-full.txt
```

## Current Code To Preserve

- `createHermesRuntimeService()`
  - keep `generateDraft`, `generateCommandResult`, and `executeMinion`
  - keep `oneshot` as the default runtime mode
  - keep current JSON parsing/failure behavior unless a test explicitly changes it

- Telegram runtime
  - keep existing text replies working
  - add GIF/media boundary action behavior without breaking `sendMessage`

- Hades auth and persistence boundaries
  - Hades remains authority for user/tenant, approvals, route, and final send/publish actions

## New TDD Commands

Backend red contracts:

```bash
npm --prefix backend run test:hades-autonomous-hermes-runtime
npm run test:hades-autonomous-hermes-runtime
```

Railway/browser E2E, env-gated:

```bash
npm run test:hades-autonomous-hermes-e2e
```

Run real E2E only when Opencode has Railway/browser/session env:

```bash
HADES_AUTONOMOUS_HERMES_E2E=1 HADES_E2E_BASE_URL=https://<railway-url> npm run test:hades-autonomous-hermes-e2e
```

Optional E2E env:

```bash
HADES_E2E_AUTH_TOKEN=<browser-session-or-test-token>
HADES_E2E_USER_ID=<expected-user-id>
HADES_E2E_TENANT_ID=<expected-tenant-id>
```

## Red Test Files

```text
backend/src/modules/hades/tests/unit/hades.autonomous-hermes-runtime.tdd.test.js
backend/src/modules/hades/tests/unit/hades.autonomous-hermes-persistence.tdd.test.js
scripts/hades-autonomous-hermes-e2e.tdd.test.mjs
```

## Required Modules

Add these modules:

```text
backend/src/modules/hades/runtime/hermesWorkspace.js
backend/src/modules/hades/runtime/hermesStateStore.js
backend/src/modules/hades/runtime/hermesProcessManager.js
backend/src/modules/hades/runtime/hermesRoutingToken.js
backend/src/modules/hades/runtime/hermesCapabilityEnvelope.js
backend/src/modules/hades/runtime/hermesBoundaryActionBroker.js
backend/src/modules/hades/repositories/hermesStateRepository.js
```

Add migrations:

```text
backend/src/modules/hades/migrations/012_hades_hermes_state_index.sql
backend/src/modules/hades/migrations/013_hades_hermes_task_routes.sql
```

Optional compatibility modules if useful:

```text
backend/src/modules/hades/services/hermesSkillSync.service.js
backend/src/modules/hades/repositories/hermesSkillRepository.js
backend/src/modules/hades/repositories/hermesRunRepository.js
```

But the new primary persistence target is R2 plus Supabase metadata, not storing full skills/runs as big Supabase rows.

## Contracts

### Workspace

`createHermesWorkspaceService()` must:

- resolve scoped `HERMES_HOME`, cache, skills, memory, sessions, logs, and artifacts directories
- include tenant and user path segments
- reject traversal and empty identities
- expose `env.HERMES_HOME` and `env.HERMES_CACHE_DIR`
- exclude service-role and unrelated env from Hermes subprocess env

### R2 State Store

`createHermesStateStore()` must:

- hydrate selected R2 objects into a user workspace
- snapshot changed workspace files to R2
- calculate content hashes
- scope object keys by tenant and user
- skip or reject secret-bearing files unless encrypted
- return object keys and hashes for Supabase indexing

### Supabase Metadata Index

`createHermesStateRepository()` must:

- store R2 object keys, hashes, versions, artifact records, task records, run summaries, and routing metadata
- scope every read/write by user and tenant
- never return raw secrets
- not store large `SKILL.md`, media, session DBs, logs, or full `HERMES_HOME` snapshots directly in Supabase

### Routing Token

`createHermesRoutingTokenService()` must:

- issue task IDs and signed/encrypted routing tokens
- verify echoed task IDs/tokens
- reject spoofed user IDs
- reject tokens for the wrong process/user/tenant
- allow Hades to route responses without trusting Hermes-authored identity

### Capability Envelope

`createHermesCapabilityEnvelope()` must:

- grant broad internal capabilities such as workspace read/write, artifact creation, media generation, skill creation, memory read/write, and MCP allowlisted use
- deny boundary actions unless explicitly proposed and verified by Hades
- keep high-risk actions separate from internal Hermes work

### Boundary Action Broker

`createHermesBoundaryActionBroker()` must:

- normalize proposed actions from Hermes
- verify routing token, user, tenant, destination, and capability
- execute low-risk allowed sends such as Telegram GIF/media when policy allows
- pause high-risk actions for approval
- redact secrets in action logs/status/errors

## Suggested Build Order

1. Implement `hermesWorkspace.js`.
2. Update `hermesRuntime.service.js` to use scoped env while preserving `oneshot`.
3. Implement `hermesRoutingToken.js`.
4. Implement `hermesCapabilityEnvelope.js`.
5. Implement `hermesStateStore.js` with fake/in-memory object storage first.
6. Implement `hermesStateRepository.js` memory mode and migrations.
7. Implement `hermesBoundaryActionBroker.js`, starting with Telegram GIF/media.
8. Implement `hermesProcessManager.js` warm-worker mode.
9. Add real R2 adapter/env config.
10. Run Railway/browser E2E with Opencode access.

## Acceptance Criteria

- Each user gets isolated `HERMES_HOME`.
- R2 stores bulky Hermes state and artifacts.
- Supabase stores scoped metadata indexes only.
- Hades-issued routing tokens prevent response/user spoofing.
- Capability envelopes allow broad Hermes autonomy without adapter-per-tool bottleneck.
- Boundary broker handles Telegram GIF/media through Hades-owned delivery.
- High-risk boundary actions pause for approval.
- E2E confirms deployed status/chat/artifact/media path without leaking secrets.

## Do Not Do

- Do not let Hermes self-declare user identity as authority.
- Do not store full large Hermes state in Supabase rows.
- Do not pass Supabase service-role keys into Hermes env.
- Do not switch default runtime mode away from `oneshot` until E2E proves the new mode.
- Do not rely on direct Hermes gateway delivery for production Telegram until user-scoped gateway security is proven.
