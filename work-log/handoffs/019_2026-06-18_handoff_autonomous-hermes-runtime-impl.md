# Handoff #019 - Autonomous Hermes Runtime Implementation

Date: 2026-06-18

## Goal

Implement the 8 autonomous Hermes runtime modules from scratch, write 2 SQL migrations, pass all 52 tests (14 TDD + 16 contract + 22 misc), and pass the module gate for transition to `autonomous-hermes-supabase-bridge`.

## What Was Done

### Runtime Modules (7 files)

| Module | File | Status | Deps |
|--------|------|--------|------|
| Workspace | `runtime/hermesWorkspace.js` | Complete, no deps | Pure path logic, traversal prevention, env sanitization |
| Routing Token | `runtime/hermesRoutingToken.js` | Complete, no deps | Pure HMAC issue + verifyResponse |
| Capability Envelope | `runtime/hermesCapabilityEnvelope.js` | Complete, no deps | Pure grant/approval gates |
| State Store | `runtime/hermesStateStore.js` | Abstract deps | Depends on objectStore (R2) + filesystem |
| Boundary Action Broker | `runtime/hermesBoundaryActionBroker.js` | Abstract deps | Depends on telegramClientFactory, artifactStore, approvalRepository |
| Process Manager | `runtime/hermesProcessManager.js` | Abstract deps | Depends on stateStore, routing, spawnRuntime |
| State Repository | `repositories/hermesStateRepository.js` | In-memory Map | supabaseClient param unused |

### SQL Migrations (2 files)

- `migrations/012_hades_hermes_state_index.sql` — creates `hades_hermes_state_objects` table + RLS
- `migrations/013_hades_hermes_task_routes.sql` — creates `hades_hermes_task_routes` table + RLS + indexes

### Tests

- 14 TDD unit tests (all pass with mocks)
- 16 contract tests (all pass)
- 22 misc tests (all pass)
- 4 E2E tests (env-gated behind `HADES_AUTONOMOUS_HERMES_E2E=1`, skipped)

## Gate Check

```
✅ GATE PASSED — lint:architecture clean
Module transition to `autonomous-hermes-supabase-bridge` is allowed.
```

## State Updates

- `agent_state.json`: module → `autonomous-hermes-supabase-bridge`, phase → `implementation`
- `autonomousHermesSupabaseBridgeTdd`: planned → in_progress
- MEMORY.md regenerated
- Session archived: `2026-06-18-autonomous-hermes-runtime-impl.md` (12,000 tokens)

## Key Decisions

- R2 for bulky state, Supabase for metadata indexes only
- HMAC routing tokens prevent response spoofing without storing raw tokens
- Capability envelope pattern: broad internal autonomy, gated boundary actions
- Dangerous env keys stripped before Hermes subprocess spawn
- No Cloudflare R2, no real Supabase, no filesystem, no Hermes subprocess wired yet — all abstract/mocked

## Remaining Gaps

1. `hermesStateRepository` — make `storage: "supabase"` mode write to real tables
2. `hermesRoutingToken` — persist route hashes through repository for restart safety
3. `hermesObjectStore` — new factory, Supabase Storage mode (R2 adapter later)
4. `hermesFilesystem` — new factory, real disk read/write under homeDir
5. `hermesRuntimeSpawn` — new factory, wrap existing Hermes runtime service
6. `hermesArtifactStore` — new factory, signed URLs for media delivery
7. `hermesStateStore` — strengthen with real object store + filesystem adapters
8. `hermesProcessManager` — wire workspace, filesystem, object store, artifact store, routing repo
9. Wire all factories in `backend/src/modules/hades/index.js`
10. E2E tests — env-gated, exercise full pipeline: workspace → spawn → run → snapshot → boundary action

## Next Steps

1. Implement `hermesObjectStore.js` with Supabase Storage mode
2. Implement `hermesFilesystem.js` with homeDir scoping
3. Implement `hermesArtifactStore.js` with signed URL gen
4. Implement `hermesRuntimeSpawn.js` wrapping existing Hermes runtime service
5. Make `hermesStateRepository.js` honor `storage: "supabase"`
6. Update `hermesRoutingToken.js` to persist route hashes
7. Strengthen `hermesStateStore.js` and `hermesProcessManager.js`
8. Wire everything in `index.js`
9. Run bridge-gap tests (currently 7 red, expect green)
10. Write E2E integration tests

## Do Not Do

- Do not add new SQL — migrations 012/013 exist, just need code to write to them
- Do not require Cloudflare R2 credentials for local tests
- Do not store raw routing tokens or service-role keys
- Do not switch default runtime mode away from `oneshot`
