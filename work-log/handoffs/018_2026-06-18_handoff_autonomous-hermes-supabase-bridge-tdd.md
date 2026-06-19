# Handoff #018 - Autonomous Hermes Supabase Bridge TDD

Date: 2026-06-18

## Goal

Make the autonomous Hermes runtime modules production-shaped enough for end-to-end testing before Cloudflare R2 is added.

Important correction from the prior handoff:

```text
Migrations 012 and 013 already exist.
Do not add more SQL for those two tables right now.
The problem is that production code does not write to them.
```

Temporary storage decision:

```text
Use Supabase temporarily for Hermes state/artifact blobs and metadata.
Keep the object-store interface R2-shaped so Cloudflare R2 can replace blob storage later.
Supabase remains acceptable only as a bridge, not the final large-state store.
```

## Read First

```text
work-log/handoffs/017_2026-06-18_handoff_autonomous-hermes-runtime-tdd.md
work-log/planning/011_2026-06-18_autonomous-hermes-runtime/plan-log.md
backend/src/modules/hades/runtime/hermesStateStore.js
backend/src/modules/hades/runtime/hermesProcessManager.js
backend/src/modules/hades/runtime/hermesRoutingToken.js
backend/src/modules/hades/runtime/hermesBoundaryActionBroker.js
backend/src/modules/hades/repositories/hermesStateRepository.js
backend/src/modules/hades/index.js
```

## New Red Test

```text
backend/src/modules/hades/tests/unit/hades.autonomous-hermes-bridge-gaps.tdd.test.js
```

Run:

```bash
npm --prefix backend run test:hades-autonomous-hermes-runtime
npm run test:hades-autonomous-hermes-runtime
```

Env-gated full pipeline E2E:

```bash
npm run test:hades-autonomous-hermes-e2e
```

Default expected result:

- all E2E tests skip unless `HADES_AUTONOMOUS_HERMES_E2E=1`

Railway/browser full pipeline:

```bash
HADES_AUTONOMOUS_HERMES_E2E=1 \
HADES_E2E_BASE_URL=https://<railway-url> \
HADES_E2E_AUTH_TOKEN=<browser-session-or-test-token> \
npm run test:hades-autonomous-hermes-e2e
```

Real Telegram delivery is separately gated:

```bash
HADES_AUTONOMOUS_HERMES_E2E=1 \
HADES_AUTONOMOUS_HERMES_TELEGRAM_E2E=1 \
HADES_E2E_BASE_URL=https://<railway-url> \
HADES_E2E_AUTH_TOKEN=<browser-session-or-test-token> \
npm run test:hades-autonomous-hermes-e2e
```

Full pipeline E2E must verify:

- runtime status reports `supabase`, `r2`, `memory`, or `disabled` without leaking secrets
- `/api/hades/hermes/tasks` creates a task and route metadata
- `/api/hades/hermes/state` returns scoped object metadata, never raw blob bodies
- `/api/hades/hermes/skills` returns scoped, hashed skill metadata, never raw secrets
- artifact-backed Telegram proposal returns scoped artifact pointers and signed URL status
- real Telegram send only runs when the extra Telegram E2E env is set
- no response exposes service-role keys, provider keys, bot tokens, raw route tokens, or `sk-` secrets

Expected starting state:

- foundation tests may already pass if the thin runtime modules exist
- bridge-gap tests should fail until production seams are implemented
- do not make the tests green by weakening them or returning fake success from production code

## Major Gaps To Close

There are 9 implementation gaps in this bridge pass.

Migration housekeeping:

- Do not add new autonomous Hermes SQL migrations.
- `012_hades_hermes_state_index.sql` and `013_hades_hermes_task_routes.sql` already exist but are dead schema until code writes to them.
- `010_hades_slack_connections.sql` and `011_hades_slack_rls.sql` exist in this checkout and are unrelated Slack migrations that predate the autonomous Hermes runtime architecture.
- If another agent state says 010/011 were merely planned or missing, treat that as stale state, not an autonomous Hermes blocker.

### 1. Dead Supabase Schema

Existing migrations:

```text
backend/src/modules/hades/migrations/012_hades_hermes_state_index.sql
backend/src/modules/hades/migrations/013_hades_hermes_task_routes.sql
```

Current issue:

- tables exist
- `hermesStateRepository.js` runs in memory even when `storage: "supabase"` is passed
- no production code writes task routes to `hades_hermes_task_routes`
- no production code writes state object metadata to `hades_hermes_state_objects`

Implement:

- `createHermesStateRepository({ storage: "supabase", supabaseClient })`
- `recordStateObject()` writes to `hades_hermes_state_objects`
- `listStateObjects()` reads scoped rows from `hades_hermes_state_objects`
- `createTaskRoute()` writes to `hades_hermes_task_routes`
- `findTaskRoute()` reads scoped rows from `hades_hermes_task_routes`
- never persist raw `routingToken`
- never persist raw provider keys or raw Hermes output containing secrets

Temporary run summaries:

- Do not add a new run summary migration in this bridge pass.
- Keep run summaries redacted and in-memory until a dedicated existing table or later migration is selected.
- The immediate Supabase bridge requirement is to make migrations 012 and 013 live: state object metadata and task routing.

### 2. Routing Token Restart Safety

Current issue:

- `hermesRoutingToken.js` uses an in-memory `Map`
- after process restart, routes disappear
- migration 013 is unused

Implement:

- accept optional `repository`
- `issueTask()` stores `taskId`, `userId`, `tenantId`, `processId`, destination, expiry, and token hash
- `verifyResponse()` can verify against repository data after a new service instance is created
- store only hashes, not raw route tokens
- keep HMAC verification deterministic from `secret + task payload`

### 3. Object Store Adapter

Create:

```text
backend/src/modules/hades/runtime/hermesObjectStore.js
```

Factory:

```js
createHermesObjectStore({ mode, supabaseClient, bucket, r2Client })
```

Required methods:

- `getObject({ key })`
- `putObject({ key, body, contentType })`
- `deleteObject({ key })`
- `createSignedUrl({ key, expiresInSeconds })`

Temporary Supabase mode:

- use Supabase Storage if configured
- bucket can be `HERMES_SUPABASE_BUCKET` or `hades-hermes-temp`
- store object bodies there for now
- keep keys in `tenants/{tenantId}/users/{userId}/hermes/...` shape

Future R2 mode:

- do not implement real R2 unless credentials are available
- keep the factory seam ready for Cloudflare R2

### 4. Filesystem Adapter

Create:

```text
backend/src/modules/hades/runtime/hermesFilesystem.js
```

Factory:

```js
createHermesFilesystem({ homeDir })
```

Required methods:

- `writeFile(targetPath, content)`
- `readChangedFiles()`

Rules:

- all writes must stay under `homeDir`
- reject traversal and absolute paths outside workspace
- create parent directories as needed
- enumerate changed files from `HERMES_HOME`
- exclude cache/temp/secret-bearing paths before snapshot

### 5. Spawn Runtime Wrapper

Create:

```text
backend/src/modules/hades/runtime/hermesRuntimeSpawn.js
```

Factory:

```js
createHermesRuntimeSpawner({ hermesRuntimeServiceFactory })
```

Responsibilities:

- wrap existing `createHermesRuntimeService()`
- preserve oneshot behavior
- inject scoped `HERMES_HOME` and `HERMES_CACHE_DIR`
- pass task metadata to Hermes prompt/runtime
- expose runtime shape expected by `hermesProcessManager.js`:
  - `id`
  - `run(task)`
  - `stop()`
  - `status()`

Do not replace the existing Hermes runtime service yet.

### 6. Artifact Store And Signed URLs

Create:

```text
backend/src/modules/hades/runtime/hermesArtifactStore.js
```

Factory:

```js
createHermesArtifactStore({ objectStore, defaultTtlSeconds })
```

Required behavior:

- validate `objectKey` belongs to `{tenantId, userId}`
- reject cross-user object keys
- call `objectStore.createSignedUrl()`
- return a short-lived URL for Telegram media send
- do not expose raw bucket credentials

### 7. Strengthen State Store With Real Adapters

Current issue:

- `hermesStateStore.js` can pass unit tests with injected stubs.
- It does not yet create/use production object-store and filesystem adapters.
- It does not hydrate from repository-indexed state objects by default.
- It does not record Supabase metadata after snapshot by default.

Implement:

- accept `objectStoreFactory`, `filesystemFactory`, and `repository`
- hydrate from `repository.listStateObjects()` when explicit objects are not passed
- use `objectStoreFactory({ userId, tenantId })`
- use `filesystemFactory({ workspace })`
- call `repository.recordStateObject()` for every snapshot object
- keep traversal and secret rejection behavior

### 8. Strengthen Process Manager With Bridge Dependencies

Current issue:

- `hermesProcessManager.js` creates a path directly from `workspaceRoot`
- it does not use `hermesWorkspaceService`
- it does not pass artifact/object/filesystem bridge dependencies into runtime
- it is still closer to a thin unit-test orchestrator than production lifecycle code

Implement:

- use `workspaceService.resolveWorkspace({ userId, tenantId })`
- hydrate workspace before task
- issue repository-backed routing token
- spawn runtime with scoped workspace and artifact store
- verify response after run
- snapshot workspace after run
- keep oneshot as default until warm/daemon modes are proven

### 9. Wire Factories In `index.js`

Current issue:

- autonomous Hermes modules exist but are not created by Hades module registration
- `scopedRepos` does not include the new runtime/repo objects
- no route/service can use them for E2E

Wire:

- `createHermesWorkspaceService`
- `createHermesStateStore`
- `createHermesStateRepository`
- `createHermesRoutingTokenService`
- `createHermesCapabilityEnvelope`
- `createHermesBoundaryActionBroker`
- `createHermesProcessManager`
- `createHermesObjectStore`
- `createHermesFilesystem`
- `createHermesRuntimeSpawner`
- `createHermesArtifactStore`

Rules:

- support `overrides` for every new factory/dependency
- if Supabase is configured, use Supabase mode
- otherwise fall back to memory only for local unit tests
- do not pass `SUPABASE_SERVICE_ROLE_KEY`, bot tokens, or unrelated secrets into Hermes subprocess env

## Build Order

1. Make `hermesStateRepository.js` honor `storage: "supabase"`.
2. Update `hermesRoutingToken.js` to persist route hashes through repository.
3. Add `hermesObjectStore.js` with Supabase Storage mode.
4. Add `hermesFilesystem.js`.
5. Add `hermesArtifactStore.js`.
6. Add `hermesRuntimeSpawn.js`.
7. Strengthen `hermesStateStore.js` to work with the real object store/filesystem adapters and repository metadata.
8. Strengthen `hermesProcessManager.js` to use workspace service, artifact store, state store, spawn runtime, and routing repository.
9. Wire all factories in `backend/src/modules/hades/index.js`.
10. Rerun autonomous Hermes tests.

## Acceptance Criteria

- Existing migrations 012/013 are live, not dead schema.
- Supabase temporary mode can persist Hermes state metadata and task routes.
- Routing tokens survive a service restart.
- State store can hydrate/snapshot through real adapters.
- Telegram GIF/media broker can resolve scoped signed artifact URLs.
- Hades registration wires the autonomous Hermes runtime components.
- R2 remains a later adapter swap, not a blocker for local green tests.

## Do Not Do

- Do not add new SQL just to satisfy the first bridge pass unless absolutely necessary.
- Do not store raw routing tokens.
- Do not store provider keys or service-role keys in run summaries.
- Do not wire Hermes to use global bot tokens directly.
- Do not make every test hit real Supabase; fake Supabase clients are enough for unit TDD.
- Do not require Cloudflare R2 credentials for local tests.
