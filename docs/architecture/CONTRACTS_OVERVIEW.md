# Architecture contracts — how it works

**One-page map** of repo contracts: what they are, how they connect, and how they are enforced.

| Quick links | |
|-------------|---|
| **Index (machine)** | [contracts/manifest.json](./contracts/manifest.json) |
| **History** | [contracts/changelog.jsonl](./contracts/changelog.jsonl) |
| **Paths on disk** | [REPO_ARTIFACT_LAYOUT.md](./REPO_ARTIFACT_LAYOUT.md) |
| **Lint** | `npm run lint:contracts` · `npm run lint:repo-artifacts` |

---

## What “contract” means here

A **contract** is a versioned agreement about paths, filenames, API shapes, or pipeline metadata. It can be:

| Form | Example |
|------|---------|
| **Markdown spec** | `docs/architecture/contracts/prePushDevLog.contract.md` |
| **JS constants** | `backend/src/modules/case-filing-ai/contracts/pipelineVersions.js` |
| **Registry doc** | `docs/API.md` endpoint table |

Contracts are **not** runtime filing data. They tell humans and agents where artifacts live and which versions are current.

---

## The contract pipeline (repo level)

```mermaid
flowchart TB
  subgraph define [Define]
    manifest[manifest.json]
    md[contracts/*.contract.md]
    js[backend/src/shared/contracts/*.contract.js]
  end

  subgraph use [Use at runtime / workflow]
    exchange[file-exchange imports/exports]
    planning[work-log/planning]
    devlog[pre-push dev logs]
    condense[condense:all snapshots]
    uploads[data/uploads + SQL]
    agents[module agents + job queue]
  end

  subgraph enforce [Enforce]
    lintC[lint:contracts]
    lintR[lint:repo-artifacts]
    lintApi[lint:api-docs]
  end

  manifest --> md
  manifest --> js
  md --> exchange
  md --> planning
  md --> devlog
  md --> condense
  md --> uploads
  md --> agents
  js --> uploads
  js --> agents
  manifest --> lintC
  manifest --> lintR
  md --> lintApi
```

### 1. Register — `manifest.json`

Every contract has an entry with:

- `version` (e.g. `v001`)
- `doc` — human-readable spec (required for new contracts)
- `file` / `utility` / `schema` / scripts — paths lint must verify exist

**Source of truth for “what contracts exist”:** [contracts/manifest.json](./contracts/manifest.json)

### 2. Document — `contracts/*.contract.md`

Each entry’s `doc` explains purpose, paths, commands, and related contracts.

### 3. Implement — `*.contract.js` (where needed)

Code exports version strings and path constants so services and scripts share one definition:

| File | Exports |
|------|---------|
| `planningPhase.contract.js` | Planning artifact paths, gate/finalize scripts |
| `prePushDevLog.contract.js` | Dev-log paths, tree ignores, npm scripts |
| `consolidatedExports.contract.js` | `file-exchange/exports/consolidated-*.json` |
| `documentPersistence.contract.js` | Upload roots, DB table names |
| `moduleAgentStateMachine.contract.js` | Agent FSM events, tables, `createAgentRuntime` |
| `asyncJobQueue.contract.js` | BullMQ queue names, `REDIS_URL`, default job options |

### 4. Record changes — `changelog.jsonl`

One JSON line per bump: `contract`, `from`, `to`, `reason`, `time`.

### 5. Enforce — npm lint scripts

| Command | Checks |
|---------|--------|
| `npm run lint:contracts` | Every path listed in `manifest.json` exists |
| `npm run lint:repo-artifacts` | Key folders + contract docs + golden stub paths |
| `npm run lint:api-docs` | Routes in code ⊆ `docs/API.md` registry |

---

## Contract catalog (starter manifest)

These entries are registered in [manifest.json](./contracts/manifest.json):

| ID | Version | What it governs |
|----|---------|-----------------|
| **repoArtifactLayout** | v001 | Canonical roots (`data/`, `file-exchange/`, `work-log/`, optional `local-artifacts.json`) |
| **fileExchange** | v001 | `imports/{stamp}/`, `exports/{stamp}/`, human-readable UTC stamps |
| **consolidatedExports** | v001 | `exports/consolidated-*.json` + `consolidated-files/` mirror, `condense:all` |
| **planningPhase** | v003 | Phase folders in `work-log/planning/` (`plan-log.md` + `audit-log.md` + in-folder manifest); study logs user-only |
| **prePushDevLog** | v001 | Paired `human/*.md` + `agent/*.json`, tree/API/test audits |
| **apiDocumentationRegistry** | v001 | `docs/API.md`, active/stub/deprecated routes |
| **documentPersistence** | v001 | Runtime uploads (`data/uploads/`) + DB tables; not file-exchange |
| **moduleAgentStateMachine** | v001 | Per-module agent FSM controller + shared runtime |
| **pipelineAgentMiniModules** | v001 | Mirrored frontend/backend pipeline agent + assigner mini-modules under `ai-ops` |
| **asyncJobQueue** | v001 | BullMQ + Redis for background jobs (SQL remains source of truth) |

Per-contract detail: follow the `doc` link in [manifest.json](./contracts/manifest.json).

### Specs synced but not in the starter manifest

| Doc | Notes |
|-----|--------|
| [architecturePushDevLog.contract.md](./contracts/architecturePushDevLog.contract.md) | Maintainer-repo `arch-log:push` when exporting starter → npm; not linted in generated apps |

Domain-specific contracts (e.g. case-filing batch layout, pipeline versions) belong in **product** repos that extend this starter, not in the boilerplate manifest.

---

## Human ↔ agent workflows (contract-driven)

| When | Command | Contract |
|------|---------|----------|
| Inbound files | `npm run import:file-exchange` | fileExchange |
| Before push | `npm run dev-log:pre-push` | prePushDevLog |
| Snapshot handoff | `npm run condense:all` | consolidatedExports |
| Clear dated exchange folders | `npm run clear:file-exchange` or `POST /api/file-exchange/clear` | fileExchange |
| Plan gate / finalize | `npm run plan:gate` · `npm run plan:finalize` | planningPhase |

---

## Related architecture docs (not in manifest)

| Doc | Scope |
|-----|--------|
| [ARCHITECTURE_GUARDRAILS.md](./ARCHITECTURE_GUARDRAILS.md) | Module boundaries, loader, lint:boundaries |
| [MODULE_INTERNAL_CONTRACT.md](./MODULE_INTERNAL_CONTRACT.md) | Inside one module (routes, services, prompts) |
| [API_DOCUMENTATION_CONTRACT.md](./API_DOCUMENTATION_CONTRACT.md) | How to maintain `docs/API.md` |

---

## Exporting architecture to the npm starter

To refresh the **boilerplate CLI template** without domain modules:

```bash
npm run export:architecture-starter -- --to packages/create-modular-monolith/template
```

Templates: `file-exchange/exports/templates/`. Output defaults to `file-exchange/exports/architecture-starter/` (gitignored). See `EXPORT_MANIFEST.json` and [PUBLISHING.md](../PUBLISHING.md).

---

## Adding a new contract

1. Add `docs/architecture/contracts/<name>.contract.md`
2. Add JS constants under `backend/.../contracts/` if code needs them
3. Add entry to [manifest.json](./contracts/manifest.json) with all paths
4. Append line to [changelog.jsonl](./contracts/changelog.jsonl)
5. Update [REPO_ARTIFACT_LAYOUT.md](./REPO_ARTIFACT_LAYOUT.md) if new roots
6. Run `npm run lint:contracts` and `npm run lint:repo-artifacts`
