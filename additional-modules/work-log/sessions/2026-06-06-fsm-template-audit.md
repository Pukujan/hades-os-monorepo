# Session: 2026-06-06 FSM Template Audit

**Branch:** `architecture/pipeline-agent-mini-modules-v001`
**Focus:** Audit `module-agent-state-machine` templates against `MODULE_INTERNAL_CONTRACT.md` and `model-condenser` reference

---

## Findings (8 total, 3 blockers for ai-ops mini-modules)

### Blockers
1. **No `index.js` in template** — Contract requires `index.js` as composition root exporting `register(app, context)`. Template has no example.
2. **Import paths wrong for ai-ops mini-modules** — `../../../shared/...` paths in `agent-runner.service.template.js:9`, `agent-run.repository.template.js:6`, `example-agent.machine.template.js:6` work for top-level modules but need one more `../` for `ai-ops/<agent-id>/` mini-modules (13 pipeline mini-modules in registry).
3. **Migration creates global tables** — `001_agent_state_machine.sql` creates `agent_runs` and `agent_run_events` globally with no per-module table prefixing or unique constraint on `(agent_id, module_name)`. Multiple modules will collide.

### Non-blocking
4. **Missing request validation in routes** — `agent.routes.template.js` accepts `req.body` raw, only checks `type` exists. Contract requires routes import from `schemas/`.
5. **Repository type confusion** — `agent-run.repository.template.js:56` `createAgentRunRepository(adapter)` returns adapter pass-through; `createInMemoryAgentRunRepository()` passes `tables` property that's never used.
6. **Template machines missing CANCEL transition** — `example-agent.machine.template.js` has no state handling `CANCEL: "cancelled"`. Contract says every non-final state should handle `CANCEL`.
7. **No prompts/ folder referenced** — `agent-actions.template.js:16` references `prompts/` but template includes no prompts folder, manifest, or loading example.
8. **model-condenser missing folders** — Contract requires `domain/`, `adapters/`, `agents/`, `schemas/`, `prompts/`, `evals/`, `repositories/`, `context/`. model-condenser has none of these.

---

## Template Files Audited
- `docs/architecture/templates/module-agent-state-machine/README.md`
- `docs/architecture/templates/module-agent-state-machine/agents/example-agent.machine.template.js`
- `docs/architecture/templates/module-agent-state-machine/services/agent-runner.service.template.js`
- `docs/architecture/templates/module-agent-state-machine/services/agent-actions.template.js`
- `docs/architecture/templates/module-agent-state-machine/routes/agent.routes.template.js`
- `docs/architecture/templates/module-agent-state-machine/repositories/agent-run.repository.template.js`
- `docs/architecture/templates/module-agent-state-machine/events/agent-triggers.template.js`
- `docs/architecture/templates/module-agent-state-machine/migrations/001_agent_state_machine.sql`

## Reference Files
- `docs/architecture/contracts/moduleAgentStateMachine.contract.md` (v001 spec)
- `docs/architecture/MODULE_INTERNAL_CONTRACT.md` (backend layout, layer rules)
- `backend/src/modules/model-condenser/` (only actual backend module on disk)
- `backend/src/shared/contracts/moduleAgentStateMachine.contract.js` (constants, re-exports)
