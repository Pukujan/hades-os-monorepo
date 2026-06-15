# Scripts And Test Ownership

The repo has accumulated scripts from deploy stabilization, architecture gates,
Hermes runtime work, Hades product work, and the new Hermes core split. Use this
map before moving anything into a new repo.

## Current Rule

- New split/refactor suites go under `scripts/tasks/<task-name>/phases/<phase-id>/`.
- Each task folder and phase folder includes `metadata.json`.
- Existing legacy scripts stay in place until touched.
- The inventory lives in `scripts/script-registry.json`.
- Task-owned handoffs live under `work-log/handoffs/<task-name>/`.

## Task Suites

| Task | Phase | Command | Purpose |
| --- | --- | --- | --- |
| `hermes-core-module-split` | `phase-1-portability` | `npm run test:portable` | Red tests for deploy artifacts, core/auth/shared Hades coupling, and non-portable strings. |

## Legacy Buckets

| Bucket | Examples | Move Policy |
| --- | --- | --- |
| `deploy` | `lint-deploy.mjs`, `lint-deploy.test.mjs` | Keep with reusable boilerplate. |
| `hermes-runtime` | `smoke-hermes-runtime*`, `smoke-hermes-chat*` | Keep with reusable boilerplate after Hades-specific prompts are separated. |
| `architecture` | module boundaries, contract lint, API docs | Keep with reusable boilerplate. |
| `planning-and-worklog` | plan/dev-log helpers | Keep if the new repo keeps the agent workflow. |
| `scaffolding-and-export` | `new-module.mjs`, architecture export/import helpers | Keep if the new repo remains the starter template. |
| `model-condenser` | condense/export scripts | Decide later; may be product/tooling-specific. |

## Metadata Template

```json
{
  "task": "task-name",
  "phase": "phase-id",
  "purpose": "Why this suite exists.",
  "owner": "area-or-module",
  "status": "red",
  "commands": ["npm run example"],
  "guards": ["Boundary or behavior protected by this suite."],
  "movePolicy": "How this suite should move during repo extraction."
}
```
