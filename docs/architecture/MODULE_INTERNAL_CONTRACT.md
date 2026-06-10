# Module internal contract

This document defines the **inside** of a feature module. [Architecture guardrails](./ARCHITECTURE_GUARDRAILS.md) define how modules talk to each other; this contract defines how code is organized **within** a module so the modular monolith can grow into a legal-services platform without repeated refactors.

Design goals:

- **Replaceable features** — each module can later become a service.
- **Testable layers** — unit tests on services/domain; integration tests on routes; evals on prompts.
- **AI-ready** — prompts and evals are first-class, versioned, and colocated with the feature that uses them.
- **Predictable dependencies** — one direction of imports; lint catches violations early.

---

## Backend layout

Every feature module lives at `backend/src/modules/<module-name>/` and **must** follow this tree. Folders may start empty (`.gitkeep`); the scaffolder creates them all.

```text
<module-name>/
├── index.js              # Composition root ONLY — wires routes, events, config
├── config/               # Module env & constants
├── routes/               # HTTP (Express routers + thin handlers)
├── services/             # Use cases & orchestration (including AI flows)
├── repositories/         # Persistence & query access
├── domain/               # Entities, value objects, domain rules (no I/O)
├── adapters/             # External systems (courts, e-file, storage, LLM clients)
├── agents/               # State machine definitions per AI agent (pure, no I/O)
├── events/               # Subscribe/emit helpers for this module
├── schemas/              # Request/response validation & DTO shapes
├── prompts/              # Versioned LLM prompt templates + manifest
│   ├── manifest.json
│   └── templates/
├── evals/                # Prompt/flow evaluation (datasets + runners)
│   ├── datasets/
│   └── runners/
├── utils/                # Pure helpers private to this module
└── tests/
    ├── unit/
    └── integration/
```

### Layer responsibilities

| Layer | Responsibility | May import |
| --- | --- | --- |
| **index** | `register(app, context)` — mount routes, register listeners | Any layer in **this** module, `src/shared/*`, npm |
| **routes** | HTTP mapping, status codes, call services | `services`, `schemas`, `shared`, npm |

**HTTP API docs:** Every route must be listed in `docs/<module-name>/API.md` and `docs/API.md` (endpoint registry). See [API documentation contract](./API_DOCUMENTATION_CONTRACT.md). Enforced via `npm run lint:api-docs`.
| **services** | Business logic, transactions, AI orchestration | `domain`, `repositories`, `adapters`, `prompts`, `schemas`, `events`, `agents`, `utils`, `config`, `shared`, npm |
| **repositories** | DB/files/API persistence | `domain`, `adapters`, `schemas`, `utils`, `shared`, npm |
| **adapters** | Third-party APIs, SDK wrappers | `domain`, `schemas`, `utils`, `shared`, npm |
| **agents** | FSM definitions for module AI agents (pure transition tables) | `schemas`, `utils`, `shared`, npm |
| **domain** | Pure rules and types | `utils` (pure only), `shared` (types/helpers only), npm |
| **events** | Module event handlers | `services`, `schemas`, `shared`, npm |
| **prompts** | Prompt templates & metadata (no side effects) | `schemas`, `utils`, npm |
| **evals** | Offline evaluation of prompts/flows | `services`, `prompts`, `schemas`, `shared`, npm |
| **schemas** | Validation contracts | `utils`, npm |
| **utils** | Pure functions | Other `utils`, `shared`, npm |
| **config** | Env parsing for this module | `shared`, npm |
| **tests** | Automated tests | Anything in module (test code is exempt from layer lint) |

### Dependency rules (enforced)

The layer linter (`npm run lint:layers`) rejects imports that skip layers or create cycles.

**Hard rules:**

1. **routes** must not import `repositories`, `adapters`, `domain`, `prompts`, `events`, or `evals` directly — go through **services**.
2. **domain** must stay pure — no `services`, `routes`, `repositories`, `adapters`, `events`, `prompts`, or `evals`.
3. **prompts** stay declarative — no `services`, `routes`, `repositories`, `adapters`, or `events`.
4. **repositories** must not import `services` or `routes`.
5. **utils** stay leaf nodes — no `services`, `routes`, `repositories`, etc.
6. **evals** exercise behavior through **services** (and `prompts`/`schemas`), not HTTP.
7. **agents** (FSM `*.machine.js` files) stay declarative — no I/O. Side effects live in each agent mini-module's `services/` or parent `services/agent-runner.service.js` ([moduleAgentStateMachine contract](./contracts/moduleAgentStateMachine.contract.md)).

`index.js` is the only composition root and may wire everything.

### Backend agent mini-modules (under `ai-ops/`)

Agent workers and orchestrators are **mini-modules inside the ai-ops parent** — same barrel rules as frontend workspace modules. The parent owns run persistence and the shared FSM runner; agents are loaded via `services/agent-registry.service.js`.

```text
backend/src/modules/ai-ops/
├── index.js                    ← /api/ai-ops mount, agent runner wiring
├── services/                   ← agent-registry, agent-runner, health
├── repositories/               ← agent_runs persistence
├── rule-discovery-run/         ← pipeline orchestrator (calls worker agents)
├── ocr-agent/                  ← OCR worker (classify + vision OCR)
├── parser-agent/               ← PDF text-layer vs scan routing (parser worker)
└── documents/                  ← separate top-level module (document vault)
```

Each agent mini-module follows the standard module layout:

```text
backend/src/modules/ai-ops/<agent-id>/
├── index.js                    ← REQUIRED public barrel
├── manifest.json               ← when registered as FSM agent
├── agents/                     ← FSM (*.machine.js) — orchestrators + workers with runs
├── services/                   ← action handlers
├── routes/                     ← optional HTTP (e.g. classify)
├── schemas/, prompts/, evals/, tests/, data/
```

**Rules:**

1. Sibling code under `ai-ops/` imports agents ONLY via `../<agent-id>` or `../<agent-id>/index.js`.
2. `parser-agent` is a worker capability; `ocr-agent` and future workers call it via the barrel — no deep imports into `parser-agent/services/`.
3. Orchestrators (`rule-discovery-run`) assign work to worker agents via their barrels or agent runs — not by nesting code under the orchestrator folder.
4. Enforced via `BACKEND_PARENT_MINI_MODULES` in `scripts/lib/parent-mini-modules.config.mjs` and `npm run lint:mini-modules`.

### Prompts & evals (platform / AI)

**Prompts**

- One file per prompt under `prompts/templates/` exporting at minimum: `id`, `version`, `template`.
- Register every prompt in `prompts/manifest.json` for discovery and eval runners.
- Bump `version` when template text changes (aids regression and audit for legal workflows).

**Evals**

- **datasets/** — JSON fixtures: input, expected constraints, optional golden output.
- **runners/** — Node scripts or `node:test` files that load a prompt + call a service, assert structure/thresholds.
- Evals are **not** production routes; they run in CI or locally via `npm run test:evals -- <module-name>`.

This keeps prompt engineering colocated with the feature that owns the legal workflow, while services remain the single runtime orchestration point.

---

## Frontend layout

```text
<module-name>/
├── index.jsx             # Route contract ONLY (route, label, Component)
├── pages/                # Route-level screens
├── components/         # Presentational UI (props in, JSX out)
├── hooks/                # Stateful UI logic, data fetching
├── services/             # API client calls for this module
├── schemas/              # Client-side validation / types
├── utils/                # Module-private helpers
├── prompts/              # UX copy, assistant hints, tool instructions (optional)
└── tests/
    └── unit/
```

### Frontend dependency rules

| Layer | May import |
| --- | --- |
| **index** | `pages`, `shared` |
| **pages** | `components`, `hooks`, `services`, `schemas`, `utils`, `shared` |
| **components** | `utils`, `schemas`, `shared` (no direct `services`) |
| **hooks** | `services`, `schemas`, `utils`, `shared` |
| **services** | `schemas`, `utils`, `shared` |
| **schemas** | `utils`, npm |
| **utils** | `shared`, npm |

Pages and hooks talk to the backend; presentational components do not call `fetch` directly.

---

## Parent modules and mini-modules (frontend)

Some features (e.g. `case-management`, `ai-ops`) are **parent workspace modules**. They may omit `index.jsx` registry discovery; routes are registered manually in `frontend/src/app/router.jsx`.

### Parent module layout

```text
<parent-module>/
├── index.js                 # Optional public barrel (not the route registry entry)
├── layout/                  # Shell components
├── pages/                   # Dashboard + top-level routes
├── context/                 # Cross-mini-module session providers
├── services/                # Orchestration only — delegates to mini-modules
├── data/                    # Cross-run seeds shared by multiple mini-modules
└── <mini-module>/           # Internal capability (see below)
```

### Mini-module layout

Each mini-module is **private to the parent** — not a sibling under `src/modules/`.

```text
<mini-module>/
├── index.js                 # REQUIRED public surface for sibling imports
├── components/
├── services/
├── data/                    # Mini-module-specific demo-*.json
├── pages/                   # Optional sub-route screens
├── hooks/
└── utils/
```

### Mini-module rules

1. **Public API:** Sibling code imports ONLY from `../<mini-module>` (the `index.js` barrel).
2. **No deep imports:** Do not import `../other-mini-module/components/Foo.jsx`.
3. **No upward leakage:** Mini-modules do not import from other top-level modules under `src/modules/`.
4. **Shared code:** Cross-app helpers live in `frontend/src/shared/` or the parent `shared/` mini-module.
5. **Layers inside mini-modules:** Same as flat modules (pages/hooks → services → data; components stay presentational).
6. **Orchestration:** Only parent `services/` or a dedicated `state-machine/` mini-module sequences multiple mini-modules.
7. **Extraction:** A mini-module becomes a top-level module only when it has its own route, API, and team boundary.

### Workspace vs feature module

| Type | Route registration | Example |
|------|-------------------|---------|
| Feature module | `index.jsx` + moduleRegistry or manual | `documents` |
| Workspace parent | Manual nested routes in `app/router.jsx` | `case-management`, `ai-ops` |

---

## Cross-cutting conventions

### Naming

- Files: **kebab-case** (`intake-form.service.js`, `use-intake-form.js`).
- Tests: `*.test.js` / `*.test.jsx` under `tests/`.
- Eval runners: `*.eval.mjs` under `evals/runners/`.

### API & routes

- Backend mount: `/api/<module-name>` (in `index.js` only).
- Frontend route: `/<module-name>` (in `index.jsx` only).

### Reference module

`backend/src/modules/_reference/` and `frontend/src/modules/_reference/` are a **non-loaded** example (names starting with `_` are skipped by the loaders). Copy from them when building by hand; prefer `npm run new:module` for real features.

### When to split into subfolders

Stay in one module until you have multiple unrelated subdomains or teams. Then add **capability subfolders** inside a layer (e.g. `services/filing/`, `services/deadlines/`) — not new top-level modules — until a clear extraction boundary exists.

---

## Enforcement

| Command | Checks |
| --- | --- |
| `npm run lint:boundaries` | Cross-top-level-module imports (absolute path strings + frontend relative imports with allowlist) |
| `npm run lint:mini-modules` | Parent mini-module barrel-only imports (frontend + backend `ai-ops/<agent-id>/`) |
| `npm run lint:layers` | Layer import rules inside each backend module |
| `npm test` | Unit + integration tests (`node:test`) |
| `npm run test:evals` | Module eval runners |

Config: [`scripts/lib/parent-mini-modules.config.mjs`](../../scripts/lib/parent-mini-modules.config.mjs). Tests: [`backend/scripts/boundary-lint.test.mjs`](../../backend/scripts/boundary-lint.test.mjs).

---

## Related files

- [Architecture guardrails](./ARCHITECTURE_GUARDRAILS.md) — inter-module contract
- `scripts/new-module.mjs` — scaffolds this layout
- `backend/scripts/check-module-layers.mjs`
- `backend/scripts/check-module-boundaries.mjs`
- `backend/scripts/check-parent-mini-modules.mjs`
- `backend/src/modules/_reference/` — living backend example
