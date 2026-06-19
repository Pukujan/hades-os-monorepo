# Handoff #019 - Hades/Hermes Peer Model

Date: 2026-06-19

## Decision

Hades and Hermes become peers.

Hades must stop acting as the client-facing proxy for every Hermes call.

Important correction after reading the official Hermes docs:

```text
Use Hermes Profiles and container backends as first-class primitives.
Do not reinvent profile isolation, gateway token ownership, env filtering, SSRF protection, or session isolation in Hades unless Hades is intentionally departing from stock Hermes behavior.
```

Target:

```text
Client -> Supabase auth -> JWT
Client -> Hades session bootstrap with Supabase JWT
Hades -> verifies JWT, resolves/provisions Hermes profile, returns public edge route only
Client -> thin edge/reverse-proxy route with Supabase/session auth
Edge/reverse proxy -> injects per-profile Hermes API_SERVER_KEY server-side
Edge/reverse proxy -> forwards to loopback/internal Hermes profile API server
Client -> Hades directly with same Supabase JWT for custom scripts/business logic
Hermes -> Hades only for boundary approvals, integration execution, audit/state-index writes
```

Blocking correction after checking Hermes Architecture, Programmatic Integration, API Server, Profiles, and Secrets docs:

```text
Stock Hermes does not validate Supabase JWTs at its API server.
The Hermes API server is an OpenAI-compatible gateway surface configured per profile with API_SERVER_* env vars.
Hermes API server auth is static bearer auth via API_SERVER_KEY.
X-Hermes-Session-Id and X-Hermes-Session-Key are session/memory scoping headers, not auth.
API_SERVER_HOST defaults to 127.0.0.1 and should stay loopback/internal for this product.
Each profile's API server runs on its own address/port.
There is no single global HERMES_E2E_BASE_URL for a multi-tenant deployment.
```

Therefore, the peer model needs an auth/routing bootstrap layer, not direct Supabase JWT passthrough into Hermes.
It also needs a thin reverse-proxy/edge layer. The browser must never receive the static Hermes `API_SERVER_KEY`.

Correct target for browser chat:

```text
1. Browser calls Hades /api/hades/hermes/sessions with Supabase JWT.
2. Hades verifies identity and maps tenantId/userId -> Hermes profile.
3. Hades provisions the profile if missing, starts/ensures that profile's API server, and returns:
   - hermesApiBaseUrl
   - profileName
   - authMode: edge_injected
   - Hades-issued routing/capability token for custom boundary paths
4. Browser calls hermesApiBaseUrl, which is an edge/reverse-proxy route, not the raw Hermes loopback port.
5. Edge validates browser-facing auth/session, strips browser Authorization before upstream, injects API_SERVER_KEY server-side, and forwards to 127.0.0.1:<profile_port>.
6. Browser calls Hades directly only for Hades-owned custom scripts/business logic and approvals.
```

Only valid browser auth strategy for stock Hermes:

- Expose a thin auth translation/gateway edge that validates browser-facing auth and injects the per-profile Hermes `API_SERVER_KEY` server-side.
- Browser never sees the raw Hermes profile key.
- Do not implement the old "ephemeral Hermes API key" branch. Stock Hermes does not provide that feature.

## Why

The old model:

```text
Browser -> Hades -> Hermes -> Hades -> Browser
```

creates unnecessary latency and makes Hades downtime equal Hermes downtime.

The peer model lets Hermes keep running, snapshot state, and queue boundary actions when Hades is unavailable.

## Current Repo State

Bridge foundation is mostly complete:

- `hermesStateRepository.js` writes to `hades_hermes_state_objects` and `hades_hermes_task_routes`
- `hermesRoutingToken.js` persists route hashes through repository
- `hermesObjectStore.js`, `hermesFilesystem.js`, `hermesRuntimeSpawn.js`, `hermesArtifactStore.js` exist
- `hermesStateStore.js` can hydrate/snapshot through adapters
- `index.js` wires autonomous Hermes factories
- `npm --prefix backend run test:hades-autonomous-hermes-runtime` passes 23/23

But the architecture is still Hades-proxy shaped:

- `backend/src/modules/hades/routes/hermes.routes.js` exposes `/tasks`, `/status`, `/state`, `/skills` under Hades
- `backend/src/modules/hades/index.js` mounts `app.use("/api/hades/hermes", hermesRouter)`
- `scripts/hades-autonomous-hermes-e2e.tdd.test.mjs` still tests Hades-hosted Hermes endpoints
- `hermesProcessManager.js` still treats Hades as the orchestrator that runs tasks
- `hermesRuntimeSpawn.js` wraps the old Hades `createHermesRuntimeService()` one-shot call

## Hermes-Native Primitives To Use

Profiles:

- A Hermes profile is a separate `HERMES_HOME`.
- Each profile owns its own `config.yaml`, `.env`, `SOUL.md`, memories, sessions, skills, cron jobs, gateway state, and state DB.
- This is the native per-user/per-tenant state isolation primitive.
- Do not build a custom "profile replacement" in Hades.

Sandboxing:

- Profiles are not sandboxes.
- On the local terminal backend, a profile still has the same filesystem access as the OS user.
- Production isolation should use Hermes container-capable backends such as Docker, Modal, Daytona, or Singularity.
- Hermes docs already specify hardening such as dropped capabilities, no privilege escalation, PID limits, and size-limited tmpfs.

Gateway credentials:

- Stock Hermes expects gateway credentials such as Telegram/Discord/Slack tokens in the active profile's `.env`.
- Each profile runs its own gateway process.
- Duplicate bot tokens across profiles are blocked by Hermes token-lock safety.
- A Hades-owned Telegram broker is a deliberate product departure from stock Hermes, not the default Hermes integration model.

Built-in security layers:

- execute-code and MCP subprocess env filtering already exist.
- Session isolation and cron path hardening already exist.
- URL-capable tools include SSRF protections.
- Context-file prompt-injection scanning exists before context enters the prompt.
- Credential redaction exists for tool/MCP error paths.

Architecture implication:

```text
Hades should configure and govern Hermes profiles.
Hades should not duplicate Hermes profile/gateway/container primitives.
```

API server implication:

- Hermes API server is a gateway/platform adapter, not a global SaaS router.
- Multi-user OpenAI-compatible usage means one profile API server per profile, each on a distinct port/address.
- Hades needs a profile registry/router that persists `tenantId`, `userId`, `profileName`, `HERMES_HOME`, `apiBaseUrl`, gateway status, container/process identity, and redacted auth metadata.
- Public browser route and internal Hermes target must be different concepts.
- Internal target should be loopback/internal, for example `http://127.0.0.1:8657`.
- Public route should be an edge route, for example `https://app.example.com/hermes/<profile>/v1`.
- Registry may store `apiServerKeyHash`; raw `API_SERVER_KEY` must live only in profile `.env` or a server-side secret vault.

Profile provisioning implication:

- Profile creation is CLI-first (`hermes profile create <name>`), not a documented HTTP API.
- Hades must own a safe provisioning wrapper around Hermes CLI profile lifecycle commands.
- Profile names must be sanitized and derived from stable tenant/user IDs, not raw user input.
- Raw tenant/user input must never be passed into shell commands or filesystem paths.
- Hades must write profile `.env`/`config.yaml` with `API_SERVER_ENABLED=true`, unique `API_SERVER_PORT`, and profile-scoped provider/gateway settings.
- Hades must write `API_SERVER_HOST=127.0.0.1` unless intentionally testing a local-only Docker network. Do not expose profile API servers directly.
- Hades must not enable wildcard browser CORS on raw profile API servers.
- Hades must generate a static per-profile `API_SERVER_KEY`, but never return it to the browser.
- For host installs, set `terminal.home_mode: profile` or equivalent config so git/ssh/npm/gh home state does not bleed across tenants.

Profile state persistence implication:

- A Hermes profile is not just route metadata; it is user runtime state.
- Per-user state includes `state.db`, `state.db-shm`, `state.db-wal`, `sessions/`, `memories/`, profile-local plans/workspace metadata, gateway state, and optional user-owned skills.
- On Railway, profile homes must live under a persistent volume path such as `/data/hermes/profiles`, not normal container filesystem such as `/app`.
- In Railway mode, startup/provisioning should fail fast if `HERMES_PROFILES_ROOT` is outside `RAILWAY_VOLUME_MOUNT_PATH`.
- Supabase should store profile registry/state-index metadata; heavy profile snapshots should go to object storage such as R2 or Supabase Storage for MVP.
- Profile snapshots must be per-tenant/per-user/per-profile.
- Profile snapshots must exclude raw secrets such as `.env`, `auth.json`, `mcp-tokens/`, `API_SERVER_KEY`, bot tokens, and provider API keys.
- Profile snapshots are private backup objects; do not expose public URLs or signed URLs for them.
- Restart/redeploy proof must show the same user returns to the same profile with prior session/state metadata intact.

Container decision that must be explicit:

- `terminal.backend: docker` sandboxes Hermes tool/code execution inside a session.
- Running many profiles inside one Hermes service/container is a different and weaker isolation decision.
- Strong production isolation is one container/service per tenant/profile, plus Hermes container-capable terminal backend inside that profile when tool execution is enabled.
- If using one shared Hermes container for many profiles, document that profiles isolate state but do not provide a full tenant security boundary.

Secrets correction:

- Hermes Secrets docs support process-start secret loading from Bitwarden Secrets Manager.
- Bootstrap tokens still live in profile `.env`.
- For multi-tenant production, prefer per-profile machine credentials or a Hades-managed secret injection path rather than shared process/user-level env vars.
- Do not place `SUPABASE_SERVICE_ROLE_KEY`, global bot tokens, or shared provider keys into browser-visible session payloads.

Immediate bug found during review:

- `node --test backend/src/modules/hades/tests/unit/hades.module.wiring.test.js backend/src/modules/hades/__tests__/hadesIndex.runtimeWiring.test.js` fails 7 tests.
- Failure: `createHermesCapabilityEnvelope()` destructures `undefined` because `index.js` calls it with no args.
- Fixing peer model should also fix this constructor default.

## New Red Test

```text
backend/src/modules/hades/tests/unit/hades.hermes-peer-model.tdd.test.js
```

Run:

```bash
npm run test:hades-hermes-peer-model
npm --prefix backend run test:hades-hermes-peer-model
```

Expected starting state:

- red until peer model is implemented
- do not weaken tests back into proxy mode

## Required Changes

### 1. Stop Mounting Client-Facing Hermes Proxy Routes

Remove or split:

```text
backend/src/modules/hades/routes/hermes.routes.js
backend/src/modules/hades/index.js -> app.use("/api/hades/hermes", hermesRouter)
```

Hades should not expose:

- `POST /api/hades/hermes/tasks`
- Hades-owned Hermes runtime status for normal client chat
- Hades-owned Hermes skills list as the primary client path

Those belong on Hermes' own service/API.

Hades may keep internal endpoints for:

- boundary approval requests
- boundary action execution
- audit/state-index writes
- capability envelope issuance at session start

Suggested Hades paths:

```text
POST /api/hades/hermes/sessions
POST /api/hades/hermes/boundary-actions
POST /api/hades/hermes/audit-events
POST /api/hades/hermes/state-index
```

### 2. Move Hermes Execution Ownership Out Of Hades

Current:

```text
Hades processManager.runTask() -> spawnRuntime() -> createHermesRuntimeService()
```

Target:

```text
Hermes service owns process lifecycle, workspace, snapshots, and runtime loop.
Hades issues capability envelope/routing token at session start only.
```

More specifically:

```text
Hermes profile = tenant/user runtime identity and persistent state root.
Hermes container backend = security boundary.
Hermes gateway = stock platform delivery path when using native Hermes integrations.
Hades = custom business/domain layer, capability issuance, audit/state-index, and optional approval policy.
```

Rename mental model:

- Hermes = orchestrator
- Hermes Runtime Service = think/act/observe loop below Hermes
- `hermesRuntimeSpawn` wraps runtime service, not Hermes itself

### 3. Make Routing Tokens Stateless And Locally Verifiable

Current issue:

- token is a raw HMAC hex string
- token cannot be decoded by a fresh Hermes process
- repository fallback still requires user/tenant lookup and is Hades-shaped

Implement:

- routing token payload includes task/session ID, user ID, tenant ID, workspace ID, process lineage, capability envelope, expiry
- token format should be self-contained, for example:

```text
base64url(payload).base64url(signature)
```

- Hermes verifies locally using `HERMES_ROUTING_SECRET`
- Hades stores only token hash/metadata for audit
- no Hades callback required for normal verification

### 4. Add Hermes Profile API Session Bootstrap, Not Supabase JWT Passthrough

Incorrect assumption:

```text
Client -> Hermes directly with Supabase JWT
```

Stock Hermes API server does not natively use the app's Supabase JWT. It is an OpenAI-compatible gateway surface configured through profile `API_SERVER_*` settings.

Implement:

```text
POST /api/hades/hermes/sessions
```

Expected behavior:

- accepts Supabase user JWT
- verifies identity in Hades
- resolves/provisions the Hermes profile for `tenantId/userId`
- starts/ensures that profile's API server
- returns the profile-specific edge route, not the raw Hermes loopback target
- stores route/auth hashes for audit
- never returns raw long-lived profile secrets
- never returns `API_SERVER_KEY`

Expected response shape:

```json
{
  "profileName": "tenant_t_user_u",
  "hermesApiBaseUrl": "https://app.example.com/hermes/tenant_t_user_u/v1",
  "authMode": "edge_injected",
  "routingToken": "<hades-capability-token>"
}
```

The Hades edge/reverse proxy must translate browser-facing auth into the profile's Hermes `API_SERVER_KEY` server-side.

### 5. Add Hermes Profile Registry, Provisioner, And Router

Create:

```text
backend/src/modules/hades/runtime/hermesProfileRegistry.js
backend/src/modules/hades/runtime/hermesProfileProvisioner.js
backend/src/modules/hades/runtime/hermesProfileSessionBroker.js
backend/src/modules/hades/runtime/hermesProfileRouter.js
backend/src/modules/hades/runtime/hermesEdgeAuthProxy.js
backend/src/modules/hades/runtime/hermesProfileStatePersistence.js
```

Responsibilities:

- registry persists `tenantId/userId -> profileName/HERMES_HOME/apiBaseUrl/status/authHash`
- provisioner shells out to safe Hermes CLI profile lifecycle commands
- provisioner writes profile `.env` and `config.yaml`
- provisioner enforces `API_SERVER_HOST=127.0.0.1`, unique API server ports, and `terminal.home_mode: profile`
- router returns public edge route and internal loopback target separately
- session broker verifies Supabase JWT through Hades and returns edge route metadata only
- edge auth proxy strips browser `Authorization`, injects `API_SERVER_KEY` server-side, forwards to loopback/internal target, and preserves SSE streaming
- state persistence enforces Railway volume-backed `HERMES_PROFILES_ROOT` and secret-safe profile snapshots/restores

Hades/Hermes internal calls can still use service-role JWTs for Hades-owned endpoints, but that is separate from browser -> Hermes API auth.

### 6. Queue Boundary Actions When Hades Is Down

Current issue:

- `hermesBoundaryActionBroker.js` calls approval repository directly
- if Hades/approval endpoint is unavailable, the flow can throw/block

Target:

- create pending boundary action record
- snapshot pending action through `hermesStateStore`
- enqueue retry through a local durable queue
- return `queued_for_retry`
- Hermes continues execution where possible
- retry/resume when Hades is reachable

### 7. Update E2E Direction

Current E2E still targets:

```text
/api/hades/hermes/tasks
/api/hades/hermes/status
/api/hades/hermes/state
/api/hades/hermes/skills
```

New E2E should target:

```text
Client -> Hades session bootstrap
Hades -> returns profile-specific edge route
Client -> edge route for chat/runs
Edge -> loopback/internal Hermes profile API server with API_SERVER_KEY injected server-side
Client -> Hades only for Hades-owned custom scripts/capability envelope and boundary approvals
Hermes -> Hades for boundary/audit/state-index calls
```

Needed env:

```text
HADES_E2E_BASE_URL=<hades-service-url>
HADES_E2E_AUTH_TOKEN=<supabase-user-jwt>
HERMES_E2E_EXPECT_EDGE_INJECTED=1
HADES_INTERNAL_SERVICE_ROLE_JWT=<service-role-jwt-for-internal-call-tests>
```

Do not use one global `HERMES_E2E_BASE_URL` for multi-tenant E2E. The public edge route must come from `POST /api/hades/hermes/sessions`.
Do not expose or return `API_SERVER_KEY` in E2E responses.

Keep real Telegram delivery separately gated.

## Implementation Order

1. Fix current `createHermesCapabilityEnvelope({} = {})` constructor default so module registration works again.
2. Add peer-model red tests to CI/test scripts.
3. Replace custom per-user workspace assumptions with explicit Hermes profile mapping: `tenantId/userId -> profile name/HERMES_HOME/apiPort/edgeBaseUrl`.
4. Add profile registry, provisioner, router, session broker, edge auth proxy, and profile state persistence.
5. In Railway/local Docker mode, put `HERMES_PROFILES_ROOT` on a persistent volume and fail if it is outside the volume mount.
6. Add secret-safe per-user profile snapshot/restore for `state.db`, `sessions/`, and `memories/`.
7. Decide and document container topology: one container per tenant/profile preferred for strong isolation; shared container only if accepted as weaker.
8. Configure production Hermes profiles with a documented container backend for tool execution, not local terminal backend.
9. Set `terminal.home_mode: profile` for host/shared installs.
10. Make `hermesRoutingToken.js` stateless and locally verifiable for Hades-issued custom capabilities.
11. Split Hades Hermes routes into internal/bootstrap-only routes.
12. Remove `/api/hades/hermes/tasks` as client-facing execution proxy.
13. Update frontend/E2E to call Hades session bootstrap, then edge route.
14. Decide explicitly whether Telegram uses stock Hermes profile gateway or Hades-owned broker per product surface.
15. Add boundary-action queue/snapshot/retry behavior only for Hades-owned custom approval paths.
16. Update docs/plans to use peer terminology and Hermes-native profile/container/gateway terminology.

Do not implement these older assumptions:

```text
Client -> Hermes directly with Supabase JWT
One HERMES_E2E_BASE_URL for all tenants
SUPABASE_JWT_SECRET is required inside stock Hermes API server env
Browser receives API_SERVER_KEY or raw Hermes Authorization header
Profile API servers bind publicly by default
```

## Acceptance Criteria

- Browser no longer uses Hades application-level `/tasks` proxy for normal Hermes execution.
- Browser does need Hades once per session/bootstrap to resolve the correct profile edge route.
- Browser never receives `API_SERVER_KEY`.
- Profile API servers remain loopback/internal only.
- Edge/reverse proxy injects `API_SERVER_KEY` server-side.
- Hades downtime does not stop an already-running Hermes task.
- Stock Hermes API server does not need to validate Supabase JWT; Hades validates it during bootstrap or a Hades-owned edge validates it before forwarding.
- Hermes validates routing/capability token locally.
- Hades persists profile route metadata and does not rely on one global Hermes URL.
- Each tenant/user maps to a distinct Hermes profile and API server route.
- Profile provisioning sets unique API server port/address and `terminal.home_mode: profile`.
- In Railway mode, profile homes live under a persistent volume path.
- Same user returns to same profile and prior state metadata after service restart/redeploy.
- Profile snapshots are per-user and exclude `.env`, `API_SERVER_KEY`, bot tokens, and provider API keys.
- Hades receives only boundary approvals, integration execution calls, audit/state-index writes, and session/capability requests.
- Boundary actions queue and snapshot when Hades is down.
- Hades module registration tests pass.
- Existing autonomous bridge tests still pass where relevant, but proxy-shaped E2E is replaced.

## Commands

```bash
npm --prefix backend run test:hades-autonomous-hermes-runtime
npm --prefix backend run test:hades-hermes-peer-model
node --test backend/src/modules/hades/tests/unit/hades.module.wiring.test.js backend/src/modules/hades/__tests__/hadesIndex.runtimeWiring.test.js
npm run test:hades-autonomous-hermes-e2e
```
