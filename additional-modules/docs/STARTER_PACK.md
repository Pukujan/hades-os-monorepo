# Modular monolith starter pack

This repository is a **scalable modular monolith starter**: Express backend and Vite + React frontend with **no business modules** out of the box. You add features as self-contained modules under `backend/src/modules/` and `frontend/src/modules/` without rewriting application core.

The goal is to grow a multi-feature platform safely: each module owns its HTTP surface and UI route, while **shared** code lives under `src/shared/` on each side.

## Canonical remote

Source of truth for this codebase:

- [https://github.com/Pukujan/litigation-workflow-application](https://github.com/Pukujan/litigation-workflow-application)

Clone with:

```bash
git clone https://github.com/Pukujan/litigation-workflow-application.git
```

## What is included

| Piece | Role |
| --- | --- |
| `backend/src/core/module-loader.js` | Scans `backend/src/modules/*/index.js`, imports each, calls `register(app, context)` when present |
| `backend/src/core/server.js` | Express app shell; loads modules at startup |
| `frontend/src/core/moduleRegistry.jsx` | Eager `import.meta.glob` over `../modules/*/index.jsx`; builds the route list for the shell UI |
| `frontend/src/core/App.jsx` | Renders discovered module routes and navigation |
| `backend/src/shared/*`, `frontend/src/shared/*` | Cross-cutting helpers (HTTP errors, API client, events, and so on) |
| `scripts/new-module.mjs` | Creates a matching backend + frontend module skeleton with correct naming |
| `backend/scripts/check-module-boundaries.mjs` | Cross-module import check (backend + frontend) |
| `backend/scripts/check-module-layers.mjs` | Intra-module layer import rules (backend) |
| `docs/architecture/ARCHITECTURE_GUARDRAILS.md` | Inter-module contract |
| `docs/architecture/MODULE_INTERNAL_CONTRACT.md` | Intra-module MVC, prompts, evals, tests |
| `docs/architecture/REPO_ARTIFACT_LAYOUT.md` | Data roots, file-exchange, golden paths |
| `file-exchange/` | Dated imports/exports for human↔agent handoff |
| `AGENTS.md` | **Mandatory** agent workflow (import stamp before `process-batch`) |
| `work-log/` | Handoffs, study-docs, dev-logs |
| `backend/src/modules/_reference/` | Example layout (skipped by loaders) |

Guardrails are **documented** and **automated** where practical. See [Architecture guardrails](./architecture/ARCHITECTURE_GUARDRAILS.md) and [Module internal contract](./architecture/MODULE_INTERNAL_CONTRACT.md).

## Repository layout

```text
├── backend/src/core/          # server bootstrap, module loader
├── backend/src/modules/       # feature modules (empty except .gitkeep until you scaffold)
├── backend/src/shared/        # allowed shared imports for modules
├── frontend/src/core/         # app shell, module registry
├── frontend/src/modules/      # feature UI modules
├── frontend/src/shared/
├── docs/                      # this documentation
└── scripts/new-module.mjs     # module scaffolder
```

## Run locally

Install and start backend and frontend (from repo root):

```bash
cd backend && npm install && npm run dev
```

In another terminal:

```bash
cd frontend && npm install && npm run dev
```

Root `package.json` also exposes `npm run dev:backend` and `npm run dev:frontend`.

## Create a module

From the repository root:

```bash
node scripts/new-module.mjs <kebab-case-name> --label "Readable name"
```

Example:

```bash
node scripts/new-module.mjs intake-triage --label "Intake Triage"
```

Equivalent:

```bash
npm run new:module -- intake-triage --label "Intake Triage"
```

Restart the backend and refresh the frontend so the new route and API mount are picked up.

## Architecture checks

Before opening a pull request or in CI:

```bash
npm run lint:architecture   # boundaries + layers
npm test
npm run test:evals
```

Details: [Architecture guardrails](./architecture/ARCHITECTURE_GUARDRAILS.md), [Module internal contract](./architecture/MODULE_INTERNAL_CONTRACT.md).
