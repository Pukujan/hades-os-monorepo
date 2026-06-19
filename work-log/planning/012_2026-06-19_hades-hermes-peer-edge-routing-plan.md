# Plan Log #012 - Hades/Hermes Peer Edge Routing

Date: 2026-06-19

## Scope Size

This is a large architecture change, not a small route refactor.

Rough size:

- Backend architecture: large
- Infra/routing: large
- Security/auth: large
- Frontend client changes: medium
- E2E testing: medium-large
- Database/storage changes: small-medium if current state tables can hold profile route metadata; larger if adding a dedicated profile registry table

Expected implementation should be split into phases. Do not hand this to a lower-capability coding agent as one giant "make peer model work" task.

## Verified Hermes Facts

Checked against local official Hermes docs cache before planning:

- `docs/hermes/upstream/llms-full.txt`
- `docs/hermes/upstream/hermes-docs.agent.json`
- `docs/hermes/AGENT_CONTEXT.md`

Confirmed:

- Stock Hermes API server does not validate Supabase JWT.
- API server auth is bearer auth using `API_SERVER_KEY`.
- `API_SERVER_KEY` is static per profile and required for every deployment, including loopback.
- `X-Hermes-Session-Id` and `X-Hermes-Session-Key` are session/transcript/memory scoping headers, not auth replacements.
- API server default bind is `API_SERVER_HOST=127.0.0.1`.
- Browser CORS is not enabled by default. Direct browser access requires explicit `API_SERVER_CORS_ORIGINS`.
- Hermes API server gives access to the agent's full toolset, including terminal commands.
- Multi-user setup uses one Hermes profile per user/tenant, each with its own API server port and `API_SERVER_KEY`.

## Final Routing Decision

Do not expose profile `API_SERVER_KEY` to the browser.

Do not expose each profile API server directly to the public internet.

Do not implement "ephemeral Hermes API keys" unless Hermes adds that feature later. It is not a stock Hermes capability today.

Target:

```text
Browser -> Hades session bootstrap with Supabase JWT
Hades -> validates Supabase JWT
Hades -> resolves/provisions tenant/user Hermes profile
Hades -> returns public edge route, not API_SERVER_KEY
Browser -> thin reverse proxy / ingress route
Reverse proxy / edge -> injects profile API_SERVER_KEY server-side
Reverse proxy / edge -> forwards to 127.0.0.1:<profile_api_port>
Hermes profile API server -> runs the request
```

Important wording:

```text
"Browser calls Hermes directly" means "not through the old Hades application-level /tasks proxy."
It does not mean "browser receives API_SERVER_KEY" or "profile ports are public."
```

## Architecture Components

### Hades Session Bootstrap

Endpoint:

```text
POST /api/hades/hermes/sessions
```

Responsibilities:

- Validate Supabase user JWT.
- Resolve tenant/user identity.
- Ensure a Hermes profile exists.
- Ensure the profile API server is configured and running.
- Issue Hades routing/capability token for custom boundary paths.
- Return edge route metadata only.

Response should look like:

```json
{
  "profileName": "tenant_t_user_u",
  "hermesApiBaseUrl": "https://app.example.com/hermes/tenant_t_user_u/v1",
  "routingToken": "<hades-capability-token>",
  "authMode": "edge_injected"
}
```

Response must not contain:

- `API_SERVER_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- provider API keys
- Telegram/Discord/Slack bot tokens
- raw per-profile secrets

### Hermes Profile Registry

Needed runtime module:

```text
backend/src/modules/hades/runtime/hermesProfileRegistry.js
```

Stores:

- `tenantId`
- `userId`
- `profileName`
- `hermesHome`
- `apiHost`
- `apiPort`
- `edgeBaseUrl`
- `apiServerKeyHash`
- `gatewayStatus`
- `containerId` or process identity
- timestamps

MVP storage options:

- In-memory for unit tests.
- Supabase table if persistence is needed before production.
- Existing `hades_hermes_task_routes` is not a good long-term fit for profile registry because task routes and profile routes have different lifecycle semantics.

### Hermes Profile Provisioner

Needed runtime module:

```text
backend/src/modules/hades/runtime/hermesProfileProvisioner.js
```

Responsibilities:

- Sanitize profile names from stable tenant/user IDs.
- Run safe Hermes CLI lifecycle commands such as `hermes profile create <profileName>`.
- Write profile `.env`:
  - `API_SERVER_ENABLED=true`
  - `API_SERVER_HOST=127.0.0.1`
  - `API_SERVER_PORT=<unique-port>`
  - `API_SERVER_KEY=<generated-static-secret>`
- Write profile `config.yaml`:
  - provider/model config
  - `terminal.home_mode: profile`
  - terminal backend config
- Start or ensure profile gateway is running.

Security rules:

- Never derive shell command strings directly from raw user input.
- Never derive filesystem paths directly from raw user input.
- Profile names must be allowlisted to `[a-zA-Z0-9_-]`.
- Keep raw profile API servers bound to `127.0.0.1` or an explicitly private internal network.
- Do not enable wildcard browser CORS on raw profile API servers.
- Do not write Supabase service role keys into profile `.env`.
- Do not write global platform bot tokens into profile `.env` unless deliberately choosing stock Hermes per-profile gateway ownership.

### Hermes Profile State Persistence

Needed runtime module:

```text
backend/src/modules/hades/runtime/hermesProfileStatePersistence.js
```

Responsibilities:

- Resolve `tenantId/userId/profileName -> HERMES_HOME`.
- Ensure every resolved profile home is inside `HERMES_PROFILES_ROOT`.
- In Railway mode, fail fast unless `HERMES_PROFILES_ROOT` is inside `RAILWAY_VOLUME_MOUNT_PATH`.
- Treat `/app` and other normal container filesystem paths as unsafe for durable profile state.
- Keep per-user Hermes runtime state on persistent volume:
  - `state.db`
  - `state.db-shm`
  - `state.db-wal`
  - `sessions/`
  - `memories/`
  - user-owned profile workspace/plans metadata if product needs it
- Snapshot/restore profile state through object storage for restart/redeploy/drift recovery.
- Use Supabase for state-index/profile metadata; use R2/Supabase Storage/object store for large profile snapshots.

Snapshot security rules:

- Snapshot keys must be per-tenant/per-user/per-profile:

```text
profiles/<tenantId>/users/<userId>/<profileName>/snapshots/<snapshotId>.json
```

- Snapshots must exclude raw secrets:
  - `.env`
  - `auth.json`
  - `mcp-tokens/`
  - `API_SERVER_KEY`
  - bot tokens
  - provider API keys
- Snapshot metadata can include hashes/counts/object keys, but not raw secret contents.
- Snapshots are private backup objects; do not return public URLs or signed URLs for profile snapshots.
- Restore must only write allowlisted state paths back into the profile home.

Railway proof:

- Local Docker/Railway E2E should mount a persistent path such as `/data`.
- Set `HERMES_PROFILES_ROOT=/data/hermes/profiles`.
- Verify same user gets same `profileName` and state metadata after service restart.
- Verify raw profile API port stays private and profile state remains available.

### Edge Auth Injector / Reverse Proxy

Needed design choice:

- Cloudflare Worker
- Nginx/Caddy sidecar
- Hades-owned lightweight edge service
- Railway internal service routing if it can safely inject headers and keep profile ports private

Responsibilities:

- Validate browser-facing session/edge token, or accept a token minted by Hades bootstrap.
- Resolve `profileName -> 127.0.0.1:<apiPort> + API_SERVER_KEY`.
- Inject:

```http
Authorization: Bearer <profile API_SERVER_KEY>
```

- Forward to Hermes profile API server.
- Strip any client-provided `Authorization` header before injection.
- Keep profile API servers bound to loopback/internal network.
- Preserve SSE streaming for `/v1/chat/completions`, `/v1/responses`, and `/v1/runs/{id}/events`.

This layer should be thin. It should not recreate the old Hades application-level task proxy or inspect/transform chat bodies.

### Hermes Profile Router

Needed runtime module:

```text
backend/src/modules/hades/runtime/hermesProfileRouter.js
```

Responsibilities:

- Return edge URL for a profile.
- Return internal target URL for infra/edge only.
- Never return raw `API_SERVER_KEY` to browser consumers.
- Support health checks and profile status.

### Hades Boundary Paths

Hades keeps only custom application/business responsibilities:

- session bootstrap
- capability envelope issuance
- boundary action approval/execution
- audit/state-index writes
- custom integrations that are intentionally Hades-owned

Hades should remove client-facing:

- `POST /api/hades/hermes/tasks`
- Hades-owned `/api/hades/hermes/status` as primary Hermes runtime status
- Hades-owned `/api/hades/hermes/skills` as primary Hermes skills path

## TDD Updates Needed

Existing red tests should be tightened before implementation:

- `hermesProfileSessionBroker` test should expect `authMode: "edge_injected"` and no `hermesApiHeaders.authorization`.
- Add a test that bootstrap response never includes `API_SERVER_KEY`.
- Add `hermesProfileRouter` tests that public route differs from internal loopback target.
- Add edge injector tests:
  - strips inbound browser `Authorization`
  - injects profile `API_SERVER_KEY` server-side
  - forwards to `127.0.0.1:<profile_port>`
  - preserves SSE headers/body stream
- Add provisioner tests:
  - writes `API_SERVER_HOST=127.0.0.1`
  - writes static `API_SERVER_KEY` only to profile `.env`
  - stores only hash/redacted metadata in registry
  - sets `terminal.home_mode: profile`
- Add profile state persistence tests:
  - Railway mode rejects profile homes outside `RAILWAY_VOLUME_MOUNT_PATH`
  - same tenant/user resolves to same persistent profile home
  - snapshots include `state.db`, `sessions/`, and `memories/`
  - snapshots exclude `.env`, `API_SERVER_KEY`, bot tokens, and provider keys
- Update E2E:
  - Hades bootstrap returns edge route.
  - Browser calls edge route.
  - Edge route reaches Hermes `/v1/chat/completions`.
  - Old `/api/hades/hermes/tasks` returns 404/405/410.
  - Restart E2E proves same user returns to same profile/state metadata after restart.

## Implementation Phases

### Phase 0 - Correct Planning And Tests

- Update Handoff #019 to remove ephemeral-key fallback.
- Replace "browser calls Hermes directly with auth material" with "browser calls thin edge route; edge injects `API_SERVER_KEY`."
- Update peer-model TDD tests to encode edge-injected auth.
- Update E2E TDD to use returned edge route.

### Phase 1 - Fix Existing Wiring Regression

- Fix `createHermesCapabilityEnvelope({} = {})` constructor default.
- Verify Hades module registration tests pass again.

### Phase 2 - Profile Registry And Provisioner

- Implement `hermesProfileRegistry`.
- Implement `hermesProfileProvisioner`.
- Add profile name sanitizer.
- Add unique port allocator.
- Add profile `.env` writer.
- Add profile `config.yaml` writer with `terminal.home_mode: profile`.

### Phase 3 - Session Bootstrap

- Implement `hermesProfileSessionBroker`.
- Add `POST /api/hades/hermes/sessions`.
- Return edge route and routing/capability token.
- Do not return raw Hermes static auth.

### Phase 4 - Profile State Persistence

- Implement `hermesProfileStatePersistence`.
- Require Railway profile homes to live under persistent volume root.
- Add secret-safe snapshot/restore for `state.db`, `sessions/`, and `memories/`.
- Decide first object snapshot backend: R2 or Supabase Storage.

### Phase 5 - Edge Injector

- Choose concrete deployment target.
- Implement or configure reverse proxy.
- Map public profile route to loopback/internal profile port.
- Inject `API_SERVER_KEY` server-side.
- Preserve streaming.

### Phase 6 - Remove Old Hades Proxy

- Remove old `/api/hades/hermes/tasks`.
- Keep only bootstrap/internal Hades Hermes routes.
- Update frontend to use bootstrap + edge route.

### Phase 7 - Boundary Resilience

- Implement pending boundary action queue.
- Snapshot pending actions through `hermesStateStore`.
- Retry when Hades is reachable.

### Phase 8 - End-To-End Validation

- Env-gated Railway/browser E2E.
- Real Telegram delivery separately gated.
- Confirm profile API ports are not public.
- Confirm browser never sees `API_SERVER_KEY`.
- Confirm Hades downtime does not kill already-running Hermes profile gateway.
- Confirm same user returns to same profile and state metadata after restart/redeploy.
- Confirm profile snapshots exclude `.env`, `API_SERVER_KEY`, bot tokens, and provider keys.

## Acceptance Criteria

- Browser never receives `API_SERVER_KEY`.
- Profile API servers stay loopback/internal-only.
- Browser reaches Hermes through a thin edge route, not old Hades `/tasks` application proxy.
- Edge injects `API_SERVER_KEY` server-side.
- Hades bootstrap validates Supabase JWT and returns profile edge route.
- One tenant/user maps to one Hermes profile and one profile API server port.
- Profile `.env` stores `API_SERVER_KEY`; registry stores only hash/redacted metadata.
- Railway/local Docker profile homes live under persistent volume root, not ephemeral app filesystem.
- Per-user profile snapshots include state/session/memory data and exclude raw secrets.
- Restart/redeploy E2E proves profile route and state metadata durability.
- `X-Hermes-Session-Id` and `X-Hermes-Session-Key` may be passed for session/memory scoping but are never treated as auth.
- Old Hades client-facing Hermes proxy is removed.
- Red tests fail before implementation and pass after implementation.

## Open Decisions

- Edge implementation: Cloudflare Worker, Nginx/Caddy, Railway routing, or small dedicated Node edge service.
- Container topology: one shared Hermes container with many supervised profiles vs one container per tenant/profile.
- Whether Telegram uses stock Hermes per-profile gateway or Hades-owned boundary broker for this product surface.
- Whether to add a dedicated Supabase profile registry migration or start with in-memory plus existing state objects for TDD only.
- Whether to use Cloudflare R2 or Supabase Storage for profile snapshots in the first Railway proof.
