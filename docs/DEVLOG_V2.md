# Development log: v2 platform starter

**Branch:** `v2`  
**Base:** `main` (minimal modular monolith starter)  
**Commit:** `f035aec` — `feat(v2): module internal contract, tests, and npm create CLI`  
**Date:** May 2026  
**Repository:** [Pukujan/litigation-workflow-application](https://github.com/Pukujan/litigation-workflow-application)

---

## Executive summary

v2 turns the original minimal modular shell into a **platform-grade boilerplate** aimed at scalable products (including legal-services platforms, but not limited to them). The centerpiece is a documented and partially automated **module internal contract**: MVC-style layers inside each feature, plus first-class **prompts**, **evals**, **tests**, and **architecture lint**.

`main` remains the lightweight v1 line for simple forks and teaching. `v2` is the recommended line for production platform work and for publishing `@pukujan/create-modular-monolith`.

---

## Changes from `main`

### Summary statistics

| Metric | Value |
| --- | --- |
| Commits on `v2` not in `main` | 1 |
| Files changed | 112 |
| Lines added (approx.) | ~5,900 |
| Lines removed (approx.) | ~120 |

### What `main` had (v1)

- Express backend with `module-loader.js` (auto-load `register()` from `modules/*/index.js`)
- Vite + React frontend with `moduleRegistry.jsx` (auto-discover `modules/*/index.jsx`)
- `scripts/new-module.mjs` — created a **single** `index.js` + `index.jsx` per module
- `check-module-boundaries.mjs` — backend-only, string scan for cross-module paths
- Docs: starter pack + architecture guardrails (inter-module rules only)
- **No** prescribed structure inside a module, no tests, no AI/prompt tooling, no npm CLI

### What `v2` adds

#### 1. Module internal contract (documentation)

| File | Purpose |
| --- | --- |
| `docs/architecture/MODULE_INTERNAL_CONTRACT.md` | Full per-module layout, layer rules, prompts/evals conventions |
| `docs/architecture/ARCHITECTURE_GUARDRAILS.md` | Updated to reference internal contract + new lint |
| `docs/STARTER_PACK.md` | Architecture checks, `_reference` module |
| `docs/PUBLISHING.md` | How to publish the npm CLI |
| `docs/DEVLOG_V2.md` | This document |

#### 2. Backend feature module layout

Each module is scaffolded with:

```text
config/  routes/  services/  repositories/  domain/  adapters/
events/  schemas/  prompts/  evals/  utils/  tests/{unit,integration}/
index.js   ← composition root only
```

**Shared platform utilities:**

| File | Role |
| --- | --- |
| `backend/src/shared/ai/prompt-registry.js` | Load versioned prompts from `prompts/manifest.json`, render `{{variables}}` |
| `backend/src/shared/testing/create-test-app.js` | Minimal Express app for route integration tests |

#### 3. Frontend feature module layout

```text
pages/  components/  hooks/  services/  schemas/  utils/  prompts/  tests/
index.jsx   ← route contract only (route, label, Component)
```

#### 4. Reference implementation

| Path | Notes |
| --- | --- |
| `backend/src/modules/_reference/` | Full backend layout + health example + evals + tests |
| `frontend/src/modules/_reference/` | Full frontend layout + health card hook chain |

Folders prefixed with `_` are **skipped by loaders** (not mounted in dev/prod). They serve as living documentation and copy-paste reference.

#### 5. Enforcement tooling

| Command | Script | Scope |
| --- | --- | --- |
| `npm run lint:boundaries` | `check-module-boundaries.mjs` | Backend **and** frontend — no `/modules/<other>/` imports |
| `npm run lint:layers` | `check-module-layers.mjs` | Backend only — layer import direction inside each module |
| `npm run lint:architecture` | both | CI-friendly gate |
| `npm test` | `node:test` | Module unit + integration tests |
| `npm run test:evals` | `run-module-evals.mjs` | `evals/runners/*.eval.mjs` per module |

#### 6. Scaffolder rewrite

`scripts/new-module.mjs` now delegates to `scripts/lib/module-scaffold.mjs` and generates the **entire** tree (backend + frontend), not two flat entry files.

#### 7. npm create CLI

| Piece | Location |
| --- | --- |
| Package | `@pukujan/create-modular-monolith@2.0.0` |
| CLI | `packages/create-modular-monolith/bin/create-modular-monolith.js` |
| Bundled template | `packages/create-modular-monolith/template/` |
| Sync script | `npm run sync:cli-template` |

**Usage (after `npm publish`):**

```bash
npm create @pukujan/modular-monolith@2 my-platform
```

Flags: `--install`, `--git`.

#### 8. Root / package metadata

- Root `version` → `2.0.0`
- README distinguishes v1 (`main`) vs v2 (`v2`)
- `frontend/src/core/moduleRegistry.jsx` — ignores `_`-prefixed modules (aligned with backend loader)

---

## The contract (two levels)

### Level 1 — Inter-module (unchanged in spirit, stronger in tooling)

Defined in [ARCHITECTURE_GUARDRAILS.md](./architecture/ARCHITECTURE_GUARDRAILS.md):

- Backend: `register(app, context)` from `modules/<name>/index.js`
- Frontend: default export `{ route, label, Component }` from `modules/<name>/index.jsx`
- **No** imports across `modules/<other-name>/`
- Communication via `shared/`, HTTP (`/api/<module-name>`), and in-process `eventBus`

### Level 2 — Intra-module (new in v2)

Defined in [MODULE_INTERNAL_CONTRACT.md](./architecture/MODULE_INTERNAL_CONTRACT.md):

- **Routes** talk HTTP only; delegate to **services**
- **Services** own use cases, orchestration, and AI flows
- **Repositories** and **adapters** isolate persistence and third parties
- **Domain** stays pure (rules without I/O)
- **Prompts** are versioned, declarative templates
- **Evals** regression-test prompts/flows through services, not live HTTP
- **index** files are composition roots only — no business logic

This is the contract that supports scaling without rewriting the core app on every new feature.

---

## Problems this architecture solves

### 1. Monolith spaghetti as teams grow

**Problem:** Everyone imports everyone; features become impossible to extract or test in isolation.

**How v2 helps:** Hard module boundaries (linted) + directed layers inside each module. New work has a obvious place to land (`services/` vs `routes/` vs `adapters/`).

### 2. “We'll split into microservices later” with no seams

**Problem:** Deferred distribution without boundaries means a big-bang rewrite.

**How v2 helps:** Each feature module already owns its API prefix, UI route, events, and internal layers. A module that respects the contract is a **candidate service** with a known surface area (`/api/<name>`, event contracts, owned data).

### 3. AI / LLM features bolted on ad hoc

**Problem:** Prompts in random strings, no regression, no audit trail for legal workflows.

**How v2 helps:** `prompts/` + `manifest.json` + version bumps; `evals/` with datasets and runners in CI. Colocated with the feature that owns the workflow (intake, discovery, etc.).

### 4. Refactor churn on every new integration

**Problem:** Court APIs, e-file, storage, and auth get mixed into route handlers.

**How v2 helps:** `adapters/` and `repositories/` absorb external shape; services stay stable; routes stay thin.

### 5. Onboarding friction

**Problem:** “Where does this code go?”

**How v2 helps:** Scaffolder + `_reference` module + lint errors that point at the contract doc.

### 6. Starter vs product confusion

**Problem:** One repo trying to be both minimal demo and full platform.

**How v2 helps:** **`main` = v1 minimal**, **`v2` = platform line**, npm CLI packages v2 for new repos without cloning GitHub every time.

---

## Growth potential: path to a legal-services platform OS

### Near term (modules in one deployable)

- Add business modules: `matter-intake`, `deadlines`, `document-review`, `billing`, etc.
- Each module: own routes, UI, prompts, evals, and eventually own DB schema namespace
- `shared/` holds true cross-cutting concerns only (auth middleware, logging, prompt registry, HTTP client)

### Medium term (modular monolith at scale)

- **Capability subfolders** inside a module (`services/filing/`, `services/service-of-process/`) before splitting modules
- **Outbox / domain events** replacing raw `EventEmitter` for reliability (same module boundaries)
- **Per-module migrations** (e.g. `repositories/migrations/`) when Postgres lands
- **Feature flags** in `config/` per module

### Long term (distribution without rewrite)

| Step | Action |
| --- | --- |
| 1 | Extract module HTTP + events to a separate process |
| 2 | Replace in-process bus with message broker (same event names) |
| 3 | Move module DB to dedicated instance; keep repository interfaces |
| 4 | Frontend module → federated route or micro-frontend if needed |

The contract is deliberately **boring**: it mirrors how mature legal-tech and enterprise teams already think (matters, workflows, integrations), but encodes it in folder structure and lint so the codebase does not depend on tribal knowledge.

---

## Benefits

| Benefit | Why it matters for legal platform OS |
| --- | --- |
| **Clear ownership** | Module = product boundary (intake, calendaring, conflicts) |
| **Test pyramid per feature** | Unit (services), integration (routes), evals (AI) |
| **Audit-friendly AI** | Versioned prompts + eval datasets |
| **Replaceable integrations** | Adapters swap when court systems change |
| **Onboarding** | Scaffold + reference + failing lint with doc links |
| **Dual distribution** | Git branch for contributors, npm CLI for consumers |
| **v1 preserved** | `main` still valid for tutorials and minimal forks |

---

## Cons and tradeoffs

| Con | Reality check |
| --- | --- |
| **More folders than a todo app needs** | Overhead for tiny spikes; pay off after ~2–3 real modules |
| **Lint is string/path based, not type-aware** | Can miss dynamic imports or clever aliases; complement with code review and optional TypeScript later |
| **Frontend layers not fully linted** | Documented rules only; backend layers are automated |
| **In-process event bus** | Easy now; not durable — plan outbox before production workflows depend on it |
| **Template duplication in npm package** | `sync:cli-template` must run before publish; risk of drift if forgotten |
| **No database/auth in starter** | Intentional; modules will need shared conventions for tenancy and matter scoping |
| **`_reference` not loaded** | Good for docs; newcomers must read it deliberately |

---

## Challenges we still face (and how to handle them)

### Cross-module workflows (e.g. intake → matter → billing)

**Challenge:** Real legal flows span modules; strict isolation can push people toward sneaky imports.

**Handle:**

- Prefer **events** + well-named payloads (`matter.created`, `intake.completed`)
- For read models, use **shared read APIs** or a thin `shared/queries/` only if absolutely necessary — document every exception
- Long term: **saga / process manager** in `core/` or dedicated `workflows/` module that orchestrates without owning domain rules

### Multi-tenancy and matter scoping

**Challenge:** Every module must respect firm/client/matter boundaries.

**Handle:**

- Add `shared/auth/` + `shared/tenancy/` early; pass `context.tenant` from `register(app, context)`
- Enforce in **services**, not routes; repositories always filter by tenant id
- Schema tests that assert no cross-tenant leakage

### Data ownership

**Challenge:** One Postgres instance vs schema-per-module vs DB-per-service.

**Handle:**

- Start: single DB, **table prefixes** per module (`intake_leads`, `billing_invoices`)
- Repositories are the only DB touchpoint — eases later split
- No cross-module SQL joins; use events or API calls

### AI in production (not just evals)

**Challenge:** Evals pass but production drifts (model change, prompt injection, PII).

**Handle:**

- Keep **prompts versioned**; log `promptId` + `version` on every LLM call
- Run **evals in CI** on prompt changes
- Add redaction in `adapters/` before sending text to models
- Human-in-the-loop gates for high-risk actions (filing, sending to courts)

### Durability and compliance

**Challenge:** Legal requires audit logs, retention, e-discovery.

**Handle:**

- Append-only **audit event stream** in `shared/` (who did what, when, on which matter)
- Module services emit audit events alongside domain events
- Do not store sensitive drafts only in ephemeral LLM context

### Team discipline

**Challenge:** Lint can be bypassed (`//`, dynamic import, copy-paste).

**Handle:**

- PR checklist: `lint:architecture`, `test`, `test:evals` for modules touched
- CODEOWNERS per `modules/<name>/`
- Optional: stricter ESLint `import/no-restricted-paths` later

### TypeScript migration

**Challenge:** JavaScript starter may outgrow structural lint.

**Handle:**

- Introduce TS per module (`"allowJs": true`) starting at `schemas/` and `domain/`
- Layer rules still apply; types strengthen repository and API contracts

---

## Operational commands (v2)

```bash
# New feature
npm run new:module -- matter-intake --label "Matter Intake"

# Quality gates
npm run lint:architecture
npm test
npm run test:evals -- matter-intake

# CLI template sync (maintainers, before npm publish)
npm run sync:cli-template
```

---

## Branch strategy

| Branch | Audience | Contents |
| --- | --- | --- |
| `main` | Minimal starter, docs, low ceremony | v1 — two-file modules, basic boundary lint |
| `v2` | Platform builders, legal OS direction | Internal contract, tests, evals, CLI package |

**Recommendation:** Default new product work to `v2`. Use `main` when you want the smallest possible fork or educational baseline.

---

## Related documentation

- [Module internal contract](./architecture/MODULE_INTERNAL_CONTRACT.md)
- [Architecture guardrails](./architecture/ARCHITECTURE_GUARDRAILS.md)
- [Starter pack](./STARTER_PACK.md)
- [Publishing the CLI](./PUBLISHING.md)
- [create-modular-monolith README](../packages/create-modular-monolith/README.md)

---

## Next steps (suggested roadmap)

1. Publish `@pukujan/create-modular-monolith@2` to npm
2. Add `shared/auth` + tenant context in module loader
3. Add Postgres + first real module (`matter-intake`) with repositories
4. Replace `EventEmitter` with outbox table + dispatcher
5. Add ESLint `import/no-restricted-paths` for frontend layers
6. CI workflow on `v2`: `lint:architecture`, `test`, `test:evals`

---

*This log should be updated on each significant v2 release (contract changes, new shared capabilities, or publishing milestones).*
