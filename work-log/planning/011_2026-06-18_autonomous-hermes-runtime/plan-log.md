# Autonomous Hermes Runtime Plan Log

**Plan ID:** `011_2026-06-18_autonomous-hermes-runtime`
**Source studies:**
- `backend/src/modules/hades/studies/autonomous-hermes-cloud-study.md`
- `work-log/study-docs/005_2026-06-18_study-log_autonomous-hermes-user-universe.md`

**Hermes docs context:**
- `docs/hermes/AGENT_CONTEXT.md`
- `docs/hermes/upstream/llms.txt`
- `docs/hermes/upstream/llms-full.txt`
- `docs/hermes/upstream/hermes-docs.agent.json`

**Foundation handoff:** `work-log/handoffs/017_2026-06-18_handoff_autonomous-hermes-runtime-tdd.md`
**Supabase bridge handoff:** `work-log/handoffs/018_2026-06-18_handoff_autonomous-hermes-supabase-bridge-tdd.md`

## Summary

Revamp Hades/Hermes integration around a user-scoped Hermes universe, not a narrow hand-coded action adapter layer. Hermes should retain its broad native capabilities: skills, memory, tools, MCP, plugins, messaging gateway, media generation, cron, browser, voice, and large artifact workflows. Hades should isolate, route, approve, audit, and persist.

The updated architecture:

```text
Hermes = autonomous worker inside a user-scoped HERMES_HOME
Hades = identity, tenant isolation, signed routing, capability envelope, approvals, audit, artifact publication
R2 = bulky Hermes state, memory, skills, sessions, logs, and generated artifacts
Supabase = metadata index, auth scope, run records, approvals, hashes, object keys
```

## Current State

- `hermesRuntime.service.js` invokes Hermes as a subprocess and parses JSON.
- `HERMES_HOME` and `HERMES_CACHE_DIR` are supported but still default to shared temp paths.
- Hades already owns auth context, user/tenant scoping, social connection repositories, and Telegram/Discord delivery.
- Existing Telegram GIF behavior is narrow: Hades sends animation only when it receives a known `send_gif` action.
- Official Hermes docs are now cached locally and show Hermes supports broader capabilities than the current Hades action bridge exposes.
- Revised foundation contracts now pass for workspace isolation, thin state hydrate/snapshot, in-memory metadata, signed routing, capability envelopes, boundary actions, process identity binding, Telegram media delivery, and env-gated Railway/browser E2E.
- Bridge-gap red contracts now fail until the 9 implementation gaps are closed: Supabase repository writes to 012/013, routing tokens persist across restart, object/filesystem/spawn/artifact adapters exist, state store uses real adapters, process manager uses bridge dependencies, and `index.js` wires the autonomous Hermes factories.

## Architectural Decision

Do not make Hades manually model every Hermes skill/tool.

Instead:

- give each user a scoped Hermes runtime home
- hydrate that home from R2 and indexed metadata
- let Hermes use broad capabilities inside that workspace
- require Hades-issued `taskId` and signed/encrypted routing token on every task/response
- persist large state and artifacts to R2
- index ownership, hashes, approvals, and summaries in Supabase
- intercept only boundary-crossing actions

Boundary actions:

- send Telegram/Discord/email/SMS
- submit forms
- publish publicly
- delete important data
- spend money
- connect/revoke integrations
- write calendars/reminders if configured as high risk

## Storage Plan

Supabase is not the primary blob store for Hermes state.

Supabase stores:

- user and tenant ownership
- runtime status rows
- task records
- signed routing token metadata
- R2 object keys
- content hashes
- skill metadata and latest version pointers
- run summaries
- approvals
- audit logs
- searchable summaries

R2 stores:

- per-user `HERMES_HOME` snapshots
- `MEMORY.md`, `USER.md`, `SOUL.md`
- skill directories and versions
- session exports and state snapshots
- redacted logs
- media/video/audio/image artifacts
- generated PDFs and document artifacts
- large context bundles

Object key pattern:

```text
tenants/{tenantId}/users/{userId}/hermes/home/{snapshotId}.tar.zst
tenants/{tenantId}/users/{userId}/hermes/memory/MEMORY.md
tenants/{tenantId}/users/{userId}/hermes/user/USER.md
tenants/{tenantId}/users/{userId}/hermes/soul/SOUL.md
tenants/{tenantId}/users/{userId}/hermes/skills/{skillId}/{version}/SKILL.md
tenants/{tenantId}/users/{userId}/hermes/artifacts/{runId}/{artifactName}
tenants/{tenantId}/users/{userId}/hermes/sessions/{sessionId}.json
```

## Core Components

### 1. Hermes Workspace Service

Purpose:

- resolve per-user `HERMES_HOME`
- create user workspace directories
- hydrate files from R2
- prevent traversal and cross-user path access

Expected module:

```text
backend/src/modules/hades/runtime/hermesWorkspace.js
```

### 2. Hermes State Store

Purpose:

- push/pull Hermes state to R2
- snapshot and restore selected `HERMES_HOME` paths
- hash files before upload
- redact or skip secret-bearing files unless encrypted

Expected module:

```text
backend/src/modules/hades/runtime/hermesStateStore.js
```

### 3. Hermes Metadata Repository

Purpose:

- store Supabase metadata for R2 objects, skills, runs, routing, and snapshots
- enforce user/tenant scoping
- keep R2 object keys out of other users' visibility

Expected module:

```text
backend/src/modules/hades/repositories/hermesStateRepository.js
```

### 4. Process Manager

Purpose:

- run Hermes in `oneshot`, `warm`, or later `daemon` mode
- bind process handles to user and tenant
- serialize same-user tasks
- allow independent users to run separately
- restart crashed runtimes
- expose redacted status

Expected module:

```text
backend/src/modules/hades/runtime/hermesProcessManager.js
```

### 5. Routing Token Service

Purpose:

- issue Hades-owned task IDs and signed/encrypted routing tokens
- verify response routing
- prevent Hermes-generated identity spoofing

Expected module:

```text
backend/src/modules/hades/runtime/hermesRoutingToken.js
```

### 6. Capability Envelope

Purpose:

- describe what Hermes can do broadly for this user/task
- avoid hand-coding every Hermes skill/tool as a Hades adapter
- separate internal workspace capabilities from boundary actions

Expected module:

```text
backend/src/modules/hades/runtime/hermesCapabilityEnvelope.js
```

### 7. Boundary Action Broker

Purpose:

- receive proposed boundary actions from Hermes
- verify capability, route, user, tenant, and approval policy
- execute through Hades-owned integrations when needed

Expected module:

```text
backend/src/modules/hades/runtime/hermesBoundaryActionBroker.js
```

## Implementation Phases

Phase 1: Docs-Aligned Runtime Probe

- Re-check Hermes CLI, chat, gateway, profile, and session behavior against local upstream docs.
- Verify per-user `HERMES_HOME` can hold `MEMORY.md`, `USER.md`, `SOUL.md`, skills, sessions, logs, and cache.
- Probe whether `/data` on Railway is persistent enough for hot local state.
- Probe R2 latency for hydrate/snapshot paths.

Phase 2: User-Scoped Hermes Home

- Add workspace service.
- Replace shared default `/tmp/hades-hermes` with `{root}/{tenantId}/{userId}`.
- Seed `USER.md`, `MEMORY.md`, and capability context per user.
- Ensure no service-role or unrelated env vars enter the Hermes process.

Phase 3: R2 State Store Plus Supabase Index

- Add R2 client abstraction.
- Add state store hydrate/snapshot/sync.
- Add Supabase metadata migration/repository for object keys, hashes, latest snapshot, skill versions, and artifact records.
- Store large blobs only in R2.

Phase 4: Signed Routing

- Add task registry and routing token service.
- Require every Hermes task to include `taskId` and Hades-issued token.
- Require every response to echo `taskId` and token.
- Verify process/user/tenant/task binding before routing or executing actions.

Phase 5: Capability Envelope

- Add a capability model for broad grants.
- Start with workspace, artifact, media, skills, memory, MCP allowlist, and proposed social actions.
- Keep high-risk actions Hades-owned.

Phase 6: Boundary Action Broker

- Normalize Hermes proposed actions.
- Support Telegram GIF/media send as a boundary action.
- Support Discord send, browser submit, email send, publish, delete, and calendar writes as policy-gated action classes over time.
- Add approval handling before execution where required.

Phase 7: Process Manager Modes

- Keep `oneshot` as default.
- Add `warm` mode with per-user queues and hydrated workspace reuse.
- Add `daemon` only after Hermes gateway/session behavior is proven safe for Hades.

Phase 8: Observability And E2E

- Add runtime status endpoints.
- Add skill/artifact list endpoints backed by Supabase index and R2 keys.
- Run Railway/browser E2E through Opencode credentials.
- Verify Telegram GIF/media path from Hermes artifact/proposed action to Hades send.

## Test Plan Captured In Handoff

The Opencode handoff includes red tests for:

- per-user workspace path isolation
- R2 hydrate/snapshot/sync with content hashes
- Supabase metadata index without storing bulky state
- R2 object key scoping by tenant/user
- routing token issue/verify/reject spoofed user IDs
- process manager binds task responses to the process identity
- capability envelope grants broad internal actions without manual adapter mapping
- boundary action broker sends Telegram GIF/media only after route/capability verification
- secret redaction from R2 snapshots, logs, status, and errors
- Railway/browser E2E for status, chat, Hermes artifact creation, Telegram media delivery, and state hydration

## Existing Red Scripts

```bash
npm --prefix backend run test:hades-autonomous-hermes-runtime
npm run test:hades-autonomous-hermes-runtime
npm run test:hades-autonomous-hermes-e2e
```

These scripts now cover the R2-first target model and the Supabase bridge needed before Cloudflare R2. The backend runtime suite is intentionally red on bridge gaps, not missing SQL: migrations 012 and 013 already exist but need live repository/runtime usage.

## Acceptance Criteria

- Each user gets an isolated Hermes universe rooted at scoped `HERMES_HOME`.
- Hermes can create skills, memories, sessions, and artifacts without Hades manually modeling every internal tool.
- Large Hermes state and generated artifacts persist in R2.
- Supabase stores scoped metadata, hashes, object keys, approvals, and run summaries.
- Hades-issued routing tokens prevent identity spoofing.
- Hades boundary broker governs send/publish/submit/delete/spend actions.
- Telegram GIF/media can flow through Hermes artifact/proposed action and Hades-owned delivery.
- Opencode can verify the flow end-to-end on Railway using browser/session access.

## Open Questions

- Should R2 store full `HERMES_HOME` snapshots, individual changed files, or both?
- Which files under `HERMES_HOME` may contain secrets and must be excluded or encrypted?
- Do we use Cloudflare R2 directly from backend or route through a storage adapter compatible with other S3 providers?
- Can Hermes gateway run safely per user, or should Hades-owned delivery remain the only production messaging path for now?
- How often should state sync occur: after every task, debounced background sync, idle shutdown, or explicit checkpoint?
