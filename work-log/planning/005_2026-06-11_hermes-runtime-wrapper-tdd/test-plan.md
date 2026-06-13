# Test Plan: Hermes Runtime Wrapper TDD

**Purpose:** define the red tests ChatGPT 5.4 mini should implement against.

## Auto-Continue Instruction

Run the red tests, implement the smallest code to pass each gate, and continue to the next gate automatically. Do not wait for user approval between passing gates. Pause only for destructive operations, missing live credentials that cannot be mocked, repeated blockers, or external Hermes source changes.

## Expected Initial State

The new tests should fail before implementation because:

- `backend/src/modules/hades/services/hermesRuntime.service.js` does not exist yet.
- `createHermesService()` does not accept or call a runtime wrapper first.
- `createHadesRepository()` has no agent execution persistence methods.
- `scripts/smoke-hermes-runtime.mjs` does not exist yet.

## Red Test Files

```txt
backend/src/modules/hades/tests/unit/hermesRuntime.service.test.js
backend/src/modules/hades/tests/unit/hermes.service.test.js
backend/src/modules/hades/tests/unit/hades.repository.test.js
backend/src/modules/hades/tests/integration/hades.routes.test.js
scripts/smoke-hermes-runtime.test.mjs
```

## Runtime Wrapper Contract

Tests should require:

- Hermes command uses `--oneshot`.
- Hermes command passes `--provider openrouter`.
- Hermes command passes the configured model.
- Backend `.env` values merge into subprocess env.
- Valid JSON output becomes a normalized runtime result.
- Invalid JSON, old 64k text, and old Qwen endpoint text fail as recoverable runtime errors.

## Service Contract

Tests should require:

- runtime wrapper is tried before OpenRouter direct calls.
- successful runtime response returns `source: "hermes_runtime"`.
- runtime draft patch merges into `currentDraft`.
- invalid runtime enums fall back to local parser.
- runtime failure falls back to local parser.

## Repository Contract

Tests should require:

- `saveAgentExecution()` or equivalent exists.
- agent execution records are idempotent.
- `getSnapshot().agentExecutions` includes persisted records.
- success and fallback failure records can both be saved.

## Route Contract

Tests should require:

- `/api/hades/chat` keeps the current frontend-safe response shape.
- route response can report `source: "hermes_runtime"`.
- route response never leaks `OPENROUTER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, raw env, or raw subprocess stderr.

## Smoke Contract

Tests should require:

- mocked smoke command calls the runtime script with backend env.
- smoke rejects old 64k context-block text.
- smoke rejects old Qwen custom endpoint text.
- smoke rejects non-JSON runtime output.
- smoke accepts parseable runtime JSON.
