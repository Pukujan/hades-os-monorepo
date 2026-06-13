# Handoff: Hermes Runtime Wrapper TDD

## Purpose

Implement the Hermes runtime-wrapper conversion with test-driven development. The goal is to make the Hades backend call the external Hermes runtime first for minion drafting, while the backend keeps owning routes, product state, persistence, and API response shape.

This handoff is written for ChatGPT 5.4 mini. Continue through all phase gates automatically. Do not stop after each red/green step unless a real blocker appears.

## Read First

```txt
work-log/study-docs/002_2026-06-11_hermes-runtime-layer-study-log.md
work-log/planning/005_2026-06-11_hermes-runtime-wrapper-tdd/plan-log.md
work-log/planning/005_2026-06-11_hermes-runtime-wrapper-tdd/test-plan.md
backend/src/modules/hades/services/hermes.service.js
backend/src/modules/hades/repositories/hades.repository.js
scripts/smoke-hermes-chat.mjs
```

## Current State

- Red tests already exist for the runtime-wrapper conversion.
- `hermesRuntime.service.js` does not exist yet.
- `smoke-hermes-runtime.mjs` does not exist yet.
- `createHermesService()` still does not call a runtime wrapper first.
- `createHadesRepository()` still does not persist agent execution records.
- `/api/hades/chat` still returns `local_fallback` for the new runtime route test.

## Auto-Continue Rule

Run each phase gate and continue to the next phase when it passes. Do not ask the user to continue after a passing gate.

Stop only if:

- a command requires destructive git/file actions,
- credentials are missing for a live smoke that cannot be mocked,
- the same blocker repeats three times,
- implementing the next step would require changing external Hermes source under `~/.hermes`.

If a live smoke fails for network/provider reasons but unit and mocked smoke tests pass, document the live failure and continue with the repo implementation.

## Phase Gates

### Gate 1: Runtime Wrapper

Run:

```bash
node --test backend/src/modules/hades/tests/unit/hermesRuntime.service.test.js
```

Implement:

- `backend/src/modules/hades/services/hermesRuntime.service.js`
- injectable command runner
- `--oneshot` Hermes command
- `--provider openrouter`
- configured model from backend env
- backend `.env` merge
- JSON parsing and old 64k/Qwen blocker rejection

Gate passes when the runtime wrapper test is green.

### Gate 2: Hermes Service Wiring

Run:

```bash
node --test backend/src/modules/hades/tests/unit/hermes.service.test.js
```

Implement:

- `createHermesService()` accepts `hermesRuntime`
- runtime is called before direct OpenRouter
- successful runtime result returns `source: "hermes_runtime"`
- `sessionId` is preserved
- invalid runtime enum output falls back locally
- runtime failure falls back locally

Gate passes when the Hermes service test is green.

### Gate 3: Agent Execution Persistence

Run:

```bash
node --test backend/src/modules/hades/tests/unit/hades.repository.test.js
```

Implement:

- agent execution map/list in repository
- `saveAgentExecution()`
- idempotency for agent execution writes
- `getSnapshot().agentExecutions`
- success and fallback failure records

Gate passes when the repository test is green.

### Gate 4: Route Integration

Run:

```bash
node --test backend/src/modules/hades/tests/integration/hades.routes.test.js
```

Implement:

- register runtime service in `backend/src/modules/hades/index.js`
- wire chat flow to runtime-capable Hermes service
- preserve current `/api/hades/chat` response shape
- do not leak server secrets or raw subprocess logs

Gate passes when the route test is green.

### Gate 5: Runtime Smoke Script

Run:

```bash
node --test scripts/smoke-hermes-runtime.test.mjs
npm run test:hermes-runtime
```

Implement:

- `scripts/smoke-hermes-runtime.mjs`
- mocked command runner support
- backend env support
- parseable JSON acceptance
- old 64k and old Qwen endpoint rejection

Gate passes when mocked smoke tests are green.

### Gate 6: Final Validation

Run:

```bash
npm run test:hermes-context
npm run test:hermes-config
npm run test:hermes-chat
npm run test:hermes-runtime
```

Then run live smoke if credentials are present:

```bash
npm run smoke:hermes-runtime
```

If live smoke fails from provider/network credentials, record the exact failure and keep unit/mocked validation as the acceptance floor.

## Acceptance Criteria

- Red tests from this handoff become green.
- Backend chat tries Hermes runtime before OpenRouter direct calls.
- Direct OpenRouter is no longer the primary minion-generation path.
- Frontend-facing response shape remains compatible.
- Local parser fallback remains available.
- Agent execution metadata is persisted in repository snapshots.
- No API response leaks server-only secrets or raw subprocess logs.
- Hermes runtime smoke proves no old 64k context gate and no old Qwen endpoint.

## Notes

- Do not change the Hades UI in this pass.
- Do not mutate `~/.hermes` unless a separate regression proves Hermes itself reverted.
- Keep `backend/.env` as the shared config source.
- Keep implementation narrow and move gate by gate until all gates pass.
