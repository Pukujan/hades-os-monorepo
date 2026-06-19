# Handoff #020 - OpenCode Hades/Hermes Peer Edge Routing

Date: 2026-06-19

Audience: OpenCode implementation agent

## Read This First

Before coding, read:

```text
docs/hermes/AGENT_CONTEXT.md
docs/hermes/upstream/hermes-docs.agent.json
docs/hermes/upstream/llms-full.txt
work-log/planning/012_2026-06-19_hades-hermes-peer-edge-routing-plan.md
work-log/handoffs/019_2026-06-19_handoff_hades-hermes-peer-model.md
backend/src/modules/hades/tests/unit/hades.hermes-peer-model.tdd.test.js
scripts/hades-autonomous-hermes-e2e.tdd.test.mjs
```

Important Hermes facts already verified from official docs:

- Stock Hermes API server does not validate Supabase JWT.
- Hermes API server auth is static bearer auth via `API_SERVER_KEY`.
- `API_SERVER_KEY` is required for every deployment, including loopback.
- `API_SERVER_HOST` defaults to `127.0.0.1`.
- `X-Hermes-Session-Id` and `X-Hermes-Session-Key` are session/memory scoping headers, not auth.
- API server gives full Hermes toolset access, including terminal commands.
- Multi-user mode is one Hermes profile per user/tenant, each with its own API server port and key.

## Do Not Build These

Do not return `API_SERVER_KEY` to the browser.

Do not expose profile API ports publicly.

Do not store tenant Hermes profile homes on Railway's ephemeral filesystem.

Do not add `SUPABASE_JWT_SECRET` to stock Hermes API server env expecting Hermes to validate app JWTs.

Do not invent ephemeral Hermes API keys. Stock Hermes does not support them.

Do not keep `/api/hades/hermes/tasks` as the normal browser chat path.

Do not treat `X-Hermes-Session-Key` as auth.

## Target Architecture

```text
Browser -> Hades /api/hades/hermes/sessions with Supabase JWT
Hades -> verifies JWT
Hades -> resolves/provisions tenant/user Hermes profile
Hades -> returns public edge route only
Browser -> edge route
Edge -> strips browser Authorization before upstream
Edge -> injects per-profile API_SERVER_KEY server-side
Edge -> forwards to http://127.0.0.1:<profile_port>
Hermes profile API server -> executes request
```

Hades is still used for:

- session bootstrap
- capability/routing token issuance
- boundary actions
- audit/state-index writes
- custom Hades business logic

Hades is not used for:

- normal per-request Hermes chat proxying
- direct `/tasks` execution ownership
- duplicating Hermes profile/gateway/container primitives

## Red Tests To Make Pass

Primary unit suite:

```bash
npm run test:hades-hermes-peer-model
```

Expected starting state:

- red
- do not weaken tests
- make implementation satisfy tests

Env-gated E2E:

```bash
npm run test:hades-autonomous-hermes-e2e
```

Expected local default:

- skips unless `HADES_AUTONOMOUS_HERMES_E2E=1`

Existing bridge regression suite:

```bash
npm --prefix backend run test:hades-autonomous-hermes-runtime
```

Module wiring regression:

```bash
node --test backend/src/modules/hades/tests/unit/hades.module.wiring.test.js backend/src/modules/hades/__tests__/hadesIndex.runtimeWiring.test.js
```

Known failure to fix early:

```text
createHermesCapabilityEnvelope() destructures undefined because index.js calls it with no args.
```

## Test Contract Summary

The unit tests now expect these missing modules:

```text
backend/src/modules/hades/runtime/hermesProfileRegistry.js
backend/src/modules/hades/runtime/hermesProfileProvisioner.js
backend/src/modules/hades/runtime/hermesProfileSessionBroker.js
backend/src/modules/hades/runtime/hermesProfileRouter.js
backend/src/modules/hades/runtime/hermesEdgeAuthProxy.js
backend/src/modules/hades/runtime/hermesProfileStatePersistence.js
```

### Session Broker Contract

Factory:

```js
createHermesProfileSessionBroker({ auth, profileRegistry, profileRouter, routingToken })
```

Required behavior:

- `startSession({ supabaseJwt })`
- verifies Supabase JWT through injected `auth.verifySupabaseJwt`
- ensures profile through `profileRegistry.ensureProfile`
- gets public edge route through `profileRouter.publicRouteForProfile`
- issues Hades routing token
- returns:

```json
{
  "profileName": "tenant_a_user_a",
  "hermesApiBaseUrl": "https://app.test/hermes/tenant_a_user_a/v1",
  "authMode": "edge_injected",
  "routingToken": "..."
}
```

Must not return:

- `hermesApiHeaders`
- `apiServerKey`
- raw Supabase JWT
- static profile secret
- `API_SERVER_KEY`

### Profile Registry Contract

Factory:

```js
createHermesProfileRegistry({ storage, supabaseClient })
```

Required behavior for memory mode:

- `upsertProfile({ tenantId, userId, profileName, hermesHome, apiHost, apiPort, edgeBaseUrl, apiServerKey, gatewayStatus })`
- `findProfile({ tenantId, userId })`
- `findProfile({ profileName })`
- persist route metadata for profile lookup
- store/return `apiServerKeyHash`
- never return raw `apiServerKey`
- never serialize raw `API_SERVER_KEY`

Required returned shape:

```json
{
  "tenantId": "tenant_a",
  "userId": "user_a",
  "profileName": "tenant_a_user_a",
  "hermesHome": "/srv/hermes/profiles/tenant_a_user_a",
  "apiHost": "127.0.0.1",
  "apiPort": 8657,
  "edgeBaseUrl": "https://app.test/hermes/tenant_a_user_a/v1",
  "apiServerKeyHash": "sha256:...",
  "gatewayStatus": "running"
}
```

If adding Supabase persistence, prefer a dedicated profile registry table over reusing task route rows.

### Profile State Persistence Contract

Factory:

```js
createHermesProfileStatePersistence({
  platform,
  profilesRoot,
  railwayVolumeMountPath,
  filesystem,
  objectStore
})
```

Required behavior:

- `resolveProfileHome({ tenantId, userId, profileName })`
- `snapshotProfile({ tenantId, userId, profileName, reason })`
- `restoreProfile({ tenantId, userId, profileName, objectKey })`
- in Railway mode, require `profilesRoot` to be inside `RAILWAY_VOLUME_MOUNT_PATH`
- reject or fail fast if Railway is configured with profile homes under `/app` or any non-volume path
- resolve each profile home under the persistent root, for example `/data/hermes/profiles/<profileName>`
- snapshot user-owned Hermes state:
  - `state.db`
  - `state.db-shm`
  - `state.db-wal`
  - `sessions/`
  - `memories/`
  - optional profile-local skills/plans/workspace metadata if product wants it
- exclude raw secrets:
  - `.env`
  - `auth.json`
  - `mcp-tokens/`
  - `API_SERVER_KEY`
  - bot tokens
  - provider API keys
- write snapshots to object storage under a per-tenant/user/profile prefix:

```text
profiles/<tenantId>/users/<userId>/<profileName>/snapshots/<timestamp-or-id>.json
```

- return snapshot metadata only, never raw secret contents
- mark snapshots as private backup objects
- do not return public URLs or signed URLs for profile snapshots
- restore only allowlisted user state files back into the profile home

Railway notes:

- Railway files outside a mounted volume are ephemeral and do not persist across deployments.
- Railway exposes `RAILWAY_VOLUME_MOUNT_PATH` at runtime when a volume is attached.
- Volumes are mounted at container start, not build/pre-deploy time, so profile initialization that writes persistent data must run during service start/runtime.

### Profile Provisioner Contract

Factory:

```js
createHermesProfileProvisioner({
  hermesBin,
  profilesRoot,
  run,
  writeFile,
  allocatePort,
  generateApiServerKey
})
```

Required behavior:

- sanitize `tenantId/userId` into stable profile name
- never pass raw tenant/user input into a shell command or filesystem path
- run `hermes profile create <profileName>`
- write `.env` with:

```text
API_SERVER_ENABLED=true
API_SERVER_HOST=127.0.0.1
API_SERVER_PORT=<unique-port>
API_SERVER_KEY=<generated-static-secret>
```

- write `config.yaml` with:

```yaml
terminal:
  home_mode: profile
```

- return profile metadata without raw `API_SERVER_KEY`
- return/store `apiServerKeyHash`
- do not write Supabase service role key or Supabase JWT secret into profile files
- keep `API_SERVER_HOST=127.0.0.1`; do not bind profile API servers to `0.0.0.0`
- do not enable wildcard browser CORS on raw profile API servers

### Profile Router Contract

Factory:

```js
createHermesProfileRouter({ publicBaseUrl, registry })
```

Required methods:

```js
publicRouteForProfile({ profileName })
internalTargetForProfile({ profileName })
```

Required behavior:

- public route example: `https://app.test/hermes/tenant_a_user_a/v1`
- internal target example: `http://127.0.0.1:8657`
- public route includes `authMode: "edge_injected"`
- internal target includes only hash/redacted metadata, not raw key
- public route and internal target must not be the same URL

### Edge Auth Proxy Contract

Factory:

```js
createHermesEdgeAuthProxy({
  auth,
  profileRouter,
  apiServerKeyVault,
  fetch
})
```

Required behavior:

- `forward({ profileName, path, method, headers, body })`
- validates browser-facing request through `auth.verifyEdgeRequest`
- resolves internal target through `profileRouter.internalTargetForProfile`
- gets raw key server-side through `apiServerKeyVault.getApiServerKey`
- strips inbound browser `Authorization` before upstream
- injects:

```http
Authorization: Bearer <profile API_SERVER_KEY>
```

- forwards to loopback/internal target
- preserves SSE-compatible headers such as `accept: text/event-stream`
- preserves `X-Hermes-Session-Id` and `X-Hermes-Session-Key` as session/memory scoping headers
- never leaks raw key in response object

## Implementation Order For OpenCode

1. Fix `createHermesCapabilityEnvelope({} = {})`.
2. Run module wiring tests and confirm that specific regression is gone.
3. Implement the profile-name sanitizer and profile metadata shape.
4. Implement `hermesProfileRegistry.js`.
5. Implement `hermesProfileRouter.js`.
6. Implement `hermesProfileProvisioner.js` with injected `run/writeFile/allocatePort/generateApiServerKey` for testability.
   - include shell/path injection-safe profile-name sanitization before CLI/file use
   - keep profile API server loopback-only
7. Implement `hermesProfileStatePersistence.js`.
   - fail fast on Railway if `HERMES_PROFILES_ROOT` is outside `RAILWAY_VOLUME_MOUNT_PATH`
   - add secret-safe snapshot/restore for per-user profile state
8. Implement `hermesProfileSessionBroker.js`.
9. Implement `hermesEdgeAuthProxy.js`.
10. Split/remove old client-facing Hermes routes:
   - remove `/api/hades/hermes/tasks`
   - remove Hades-hosted `/api/hades/hermes/status` and `/api/hades/hermes/skills` as normal client-facing Hermes paths
   - keep/add `/api/hades/hermes/sessions`
   - keep/add boundary/action/audit/state-index paths
11. Wire new factories in `backend/src/modules/hades/index.js`.
12. Update E2E only after unit tests pass.
13. Run all commands in the test section.

## Local Docker Proof Before Production

Use a new branch:

```bash
git checkout -b feature/hades-hermes-peer-edge-routing
```

Local Docker proof should show:

- `HERMES_PROFILES_ROOT` points at a mounted persistent path, not normal container filesystem
- one profile is created
- profile `.env` has `API_SERVER_HOST=127.0.0.1`
- profile `.env` has static `API_SERVER_KEY`
- browser/client cannot see that key
- edge route can reach `/v1/chat/completions`
- same user gets same profile after container/service restart
- profile `state.db` / `sessions/` / `memories/` survive restart
- secret-safe snapshot contains session/memory/state metadata but not `.env`, `API_SERVER_KEY`, or bot/provider keys
- old `/api/hades/hermes/tasks` path is gone

Do not push this whole architecture directly to production before the local Docker proof works.

## Success Criteria

- `npm run test:hades-hermes-peer-model` passes.
- `npm --prefix backend run test:hades-autonomous-hermes-runtime` still passes.
- module wiring tests pass.
- env-gated E2E still skips by default and uses edge route when enabled.
- no test response contains `API_SERVER_KEY`.
- no browser/session bootstrap response contains a raw static Hermes key.
- profile API server is configured for loopback/internal bind.
- profile homes live under a persistent Railway volume in Railway mode.
- profile state snapshots are per-user and secret-safe.
- restart durability E2E proves the same user returns to the same profile and state metadata.
- edge proxy injects auth server-side and preserves streaming.

## If You Get Stuck

Do not weaken tests.

Do not replace edge injection with returning `API_SERVER_KEY`.

Do not expose `API_SERVER_HOST=0.0.0.0` as a shortcut.

Pause and update the handoff with the blocker instead.
