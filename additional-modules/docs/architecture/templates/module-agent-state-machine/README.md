# Module agent state machine — implementation guide

Copy these templates when you add per-module AI agents controlled by a state machine. Spec: [moduleAgentStateMachine.contract.md](../../contracts/moduleAgentStateMachine.contract.md).

## Quick start

```bash
npm run new:module -- intake --label "Intake"
cp -R docs/architecture/templates/module-agent-state-machine/migrations \
  backend/src/modules/intake/repositories/
```

Copy each `*.template.js` into `backend/src/modules/<module>/`, rename to drop `.template`, and fill TODOs.

## Files in this folder

| Template | Target |
|----------|--------|
| `agents/manifest.template.json` | `agents/manifest.json` |
| `agents/example-agent.machine.template.js` | `agents/<agent-id>.machine.js` |
| `services/agent-actions.template.js` | `services/agent-actions.js` |
| `services/agent-runner.service.template.js` | `services/agent-runner.service.js` |
| `repositories/agent-run.repository.template.js` | `repositories/agent-run.repository.js` |
| `events/agent-triggers.template.js` | merge into `events/index.js` |
| `routes/agent.routes.template.js` | merge into `routes/` |
| `migrations/001_agent_state_machine.sql` | `repositories/migrations/` |

## Rules

1. **All agent flow logic lives in `agents/*.machine.js`** — not in routes or scattered services.
2. **`agent-runner.service.js` is the only FSM entry point** inside the module.
3. **`agent-actions.js` implements side effects** (LLM, tools, DB reads) — returns `{ emit: { EVENT: payload } }` to auto-transition when needed.
4. **`events/index.js` listens on eventBus** and calls the runner — never imports another module.
5. One module may register **multiple agents** via `agents/manifest.json`.

## Wiring checklist

1. Run SQL migration when `DATABASE_URL` is set (or use in-memory adapter for spikes).
2. Register machines from manifest in `agent-runner.service.js`.
3. Pass `{ eventBus }` from `register(app, context)` into runner + events.
4. Mount agent routes at `/api/<module>/agents/...`.
5. Document endpoints in `docs/API.md`.
6. `npm run lint:architecture` · `npm run test:ci`.

## Linking document uploads

Listen for `document.parsed` from [documentPersistence](../../contracts/documentPersistence.contract.md):

```js
context.eventBus.on("document.parsed", ({ documentId }) => {
  agentRunner.start("intake-agent", { documentId });
});
```

Keep handler thin — delegate to `agentRunner`, not FSM logic.
