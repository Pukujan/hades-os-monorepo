# Handoff #021 - Final Hades/Hermes Peer Docker/Railway Proof

Date: 2026-06-19

Audience: OpenCode implementation/proof agent

## Status

Core Hades/Hermes peer-model implementation is complete after post-implementation audit.

Known green checks from audit:

```bash
npm run test:hades-hermes-peer-model
npm run test:hades-autonomous-hermes-runtime
node --test backend/src/modules/hades/tests/unit/hades.module.wiring.test.js backend/src/modules/hades/__tests__/hadesIndex.runtimeWiring.test.js
npm run lint:architecture
```

Expected audited results:

```text
peer-model TDD: 13/13 pass
autonomous runtime: 23/23 pass
module wiring: 10/10 pass
architecture lint: clean
```

The next step is not another unit implementation pass.

The next step is local Docker/Railway proof before production.

## Read First

Read these before changing anything:

```text
docs/hermes/AGENT_CONTEXT.md
docs/hermes/upstream/hermes-docs.agent.json
docs/hermes/upstream/llms-full.txt
work-log/planning/012_2026-06-19_hades-hermes-peer-edge-routing-plan.md
work-log/handoffs/019_2026-06-19_handoff_hades-hermes-peer-model.md
work-log/handoffs/020_2026-06-19_handoff_opencode_hades-hermes-peer-edge-routing.md
backend/src/modules/hades/tests/unit/hades.hermes-peer-model.tdd.test.js
scripts/hades-autonomous-hermes-e2e.tdd.test.mjs
scripts/hades-hermes-peer-docker-proof.e2e.test.mjs
```

Do not rely on generic architecture assumptions where Hermes docs define an existing primitive.

## Final Red Test

New proof suite:

```bash
npm run test:hades-hermes-peer-docker-proof
```

Default behavior:

```text
skips unless HADES_HERMES_PEER_PROOF_E2E=1
```

When enabled, it is expected to be red until local Docker/Railway proof hooks are wired.

Do not weaken this suite. Make the environment/proof setup satisfy it.

## Required Proof Environment

Set:

```text
HADES_HERMES_PEER_PROOF_E2E=1
HADES_E2E_BASE_URL=<local-or-railway-hades-url>
HADES_E2E_AUTH_TOKEN=<supabase-user-jwt-or-local-test-jwt>
HADES_E2E_PROFILE_PROOF_URL=<protected-proof-hook-url>
HADES_E2E_PROFILE_SNAPSHOT_URL=<protected-snapshot-proof-hook-url>
HADES_E2E_RESTART_HOOK_URL=<protected-restart-hook-url>
HADES_E2E_RESTART_WAIT_MS=30000
```

Optional:

```text
HADES_E2E_HERMES_PROOF_PATH=/models
```

`HADES_E2E_PROFILE_PROOF_URL`, `HADES_E2E_PROFILE_SNAPSHOT_URL`, and `HADES_E2E_RESTART_HOOK_URL` are proof-only/admin hooks. They must be protected and must not become browser/product APIs.

## Proof Contract

The proof suite verifies:

- Hades `/api/hades/hermes/sessions` returns only a public edge route.
- Browser/session response never includes `API_SERVER_KEY`, `hermesApiHeaders`, raw profile secret, or raw env.
- Edge route reaches Hermes API.
- Raw profile API server stays private/loopback/internal.
- Profile API host is not `0.0.0.0`.
- `apiServerKeyHash` exists, but raw `apiServerKey` never appears.
- `HERMES_PROFILES_ROOT` is on a persistent Docker/Railway volume, not `/app`.
- In Railway mode, profile home is inside `RAILWAY_VOLUME_MOUNT_PATH`.
- Profile state has `state.db`, `sessions/`, and `memories/`.
- Profile snapshots are private backup objects.
- Profile snapshots do not expose public URLs or signed URLs.
- Profile snapshots exclude `.env`, `API_SERVER_KEY`, bot tokens, provider keys, and raw service-role secrets.
- After restart, same user returns to same `profileName` and `hermesApiBaseUrl`.
- After restart, state-index metadata is still readable.

## Proof Hook Shapes

### Profile Proof Hook

`GET HADES_E2E_PROFILE_PROOF_URL?profileName=<profileName>`

Expected JSON:

```json
{
  "profileName": "tenant_a_user_a",
  "hermesApiBaseUrl": "https://app.test/hermes/tenant_a_user_a/v1",
  "authMode": "edge_injected",
  "platform": "railway",
  "profilesRoot": "/data/hermes/profiles",
  "railwayVolumeMountPath": "/data",
  "hermesHome": "/data/hermes/profiles/tenant_a_user_a",
  "apiHost": "127.0.0.1",
  "apiPort": 8657,
  "apiServerKeyHash": "sha256:...",
  "directBrowserReachable": false,
  "rawProfilePortPublic": false,
  "state": {
    "hasStateDb": true,
    "hasSessionsDir": true,
    "hasMemoriesDir": true,
    "hasEnvFile": true,
    "envReturned": false
  }
}
```

Must not include:

```text
apiServerKey
API_SERVER_KEY
rawEnv
publicDirectUrl
provider API keys
bot tokens
service role secrets
```

### Snapshot Proof Hook

`POST HADES_E2E_PROFILE_SNAPSHOT_URL`

Body:

```json
{
  "profileName": "tenant_a_user_a",
  "reason": "final-proof"
}
```

Expected JSON:

```json
{
  "objectKey": "profiles/tenant_a/users/user_a/tenant_a_user_a/snapshots/snapshot-id.json",
  "visibility": "private",
  "secretStripped": true,
  "includes": ["state.db", "sessions/", "memories/"]
}
```

Must not include:

```text
publicUrl
signedUrl
.env contents
API_SERVER_KEY
bot tokens
provider API keys
raw transcript text beyond metadata required for proof
```

### Restart Hook

`POST HADES_E2E_RESTART_HOOK_URL`

Purpose:

- local Docker proof: restart Hades/Hermes service/container pair
- Railway proof: trigger a safe restart/redeploy of the test service, not production

Must be protected. Do not expose publicly without auth.

## Local Docker Proof Checklist

Use a new branch:

```bash
git checkout -b feature/hades-hermes-peer-docker-proof
```

Set up local Docker so:

- Hades and Hermes can talk over an internal network.
- Hermes profile API servers bind to loopback/internal only.
- Edge/proxy route is the browser-facing route.
- `HERMES_PROFILES_ROOT=/data/hermes/profiles`.
- `/data` is a mounted persistent volume.
- Restart hook restarts services without deleting `/data`.

Then run:

```bash
npm run test:hades-hermes-peer-docker-proof
```

Expected first enabled run:

```text
red until proof hooks and Docker wiring exist
```

Expected final run:

```text
all proof tests pass
```

## Railway Proof Checklist

Before touching production:

- Create a separate Railway test environment/service.
- Attach a Railway volume.
- Set `HERMES_PROFILES_ROOT` inside `RAILWAY_VOLUME_MOUNT_PATH`.
- Confirm startup fails if volume is missing or root is outside the mount.
- Confirm profile state survives restart/redeploy.
- Confirm raw profile API ports are not public.
- Confirm edge route works.

Do not push to production until local Docker proof passes.

Do not migrate to production Railway until a Railway test environment passes the proof suite.

## Remaining Known Risks

- `MEMORY.md` branch label was stale in the audit (`main` vs actual `master`). Fix by setting `branch` in `agent_state.json` and regenerating memory.
- Four unrelated pre-existing failures were reported by the audit:
  - contract-discovery URL type
  - live two-user isolation
  - chat idempotency
  - extension zip manifest
- `hermesWorkerPoolPlan` remains planned and is not part of this proof.
- No local Docker proof has been completed yet.

Do not mix those unrelated failures into this proof unless the user explicitly asks.

## Files To Give OpenCode

Primary proof files:

```text
work-log/handoffs/021_2026-06-19_handoff_opencode_final_peer_docker_railway_proof.md
scripts/hades-hermes-peer-docker-proof.e2e.test.mjs
package.json
```

Core architecture and implementation context:

```text
work-log/handoffs/020_2026-06-19_handoff_opencode_hades-hermes-peer-edge-routing.md
work-log/handoffs/019_2026-06-19_handoff_hades-hermes-peer-model.md
work-log/planning/012_2026-06-19_hades-hermes-peer-edge-routing-plan.md
backend/src/modules/hades/tests/unit/hades.hermes-peer-model.tdd.test.js
scripts/hades-autonomous-hermes-e2e.tdd.test.mjs
```

Hermes docs context:

```text
docs/hermes/AGENT_CONTEXT.md
docs/hermes/upstream/hermes-docs.agent.json
docs/hermes/upstream/llms-full.txt
```

State/memory:

```text
additional-modules/buildplan/agent_state.json
MEMORY.md
```

## Final Rule

This phase is about proof, not clever shortcuts.

If proof fails, fix the deployment/proof harness.

Do not weaken tests.

Do not return `API_SERVER_KEY`.

Do not expose raw Hermes profile ports.

Do not store user profile state outside a persistent volume.
