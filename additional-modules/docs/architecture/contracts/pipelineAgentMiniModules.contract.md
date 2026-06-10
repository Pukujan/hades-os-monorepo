# Contract: pipeline agent mini-modules

**Version:** `v001`  
**Code:** `backend/src/shared/contracts/pipelineAgentMiniModules.contract.js`  
**Registry:** `backend/src/shared/contracts/pipeline-agent-mini-modules.registry.json`  
**Frontend mirror:** `frontend/src/modules/ai-ops/shared/data/pipeline-agent-mini-modules.registry.json` (byte-identical)  
**Lint:** `npm run lint:pipeline-agent-mini-modules`  
**Related:** [moduleAgentStateMachine.contract.md](./moduleAgentStateMachine.contract.md)

## Purpose

Each **rule-discovery pipeline agent** and **assigner** (parser router, orchestrator) is a **mini-module** under the parent `ai-ops` workspace, with a **matching folder on frontend and backend**.

| Layer | Parent | Mini-module root |
|-------|--------|------------------|
| Backend | `backend/src/modules/ai-ops/` | `<slug>/` (e.g. `ocr-agent/`) |
| Frontend | `frontend/src/modules/ai-ops/` | `<slug>/` or `legacySlug` during migration |

This keeps agent workbench UI, FSM workers, and lint boundaries aligned for A/B testing and incremental extraction from monolith panels.

## Kinds

| Kind | Role | Example |
|------|------|---------|
| `orchestrator` | Owns pipeline run FSM | `rule-discovery-run` |
| `assigner` | Routes work to workers | `parser-agent` |
| `worker` | Executes one pipeline concern | `filing-audit-agent` |
| `gate` | Human-in-the-loop (UI + orchestrator state) | `human-review` |

## Registry entry shape

Each object in `registry.miniModules[]`:

| Field | Required | Meaning |
|-------|----------|---------|
| `slug` | yes | Backend folder name; canonical id |
| `kind` | yes | `orchestrator` \| `assigner` \| `worker` \| `gate` |
| `label` | yes | Human label |
| `logicalAgentIds` | no | Product agent ids (`agent_*_v1`, `human_review_gate`) |
| `pipelineStepIds` | no | Rule pipeline step ids (`ingest`, `audit`, …) |
| `assignsTo` | no | Assigner → worker slugs |
| `backend.status` | yes | `planned` \| `partial` \| `implemented` \| `orchestrated` |
| `backend.manifest` | when implemented | Usually `manifest.json` |
| `frontend.slug` | yes | Frontend folder (may differ during migration) |
| `frontend.legacySlug` | no | Old folder until rename (e.g. `ocr` → `ocr-agent`) |
| `frontend.status` | yes | `planned` \| `stub` \| `partial` \| `implemented` |

## Mirroring rules

1. **Single registry** — edit `pipeline-agent-mini-modules.registry.json`, then copy to the frontend mirror (or run lint; it fails if out of sync).
2. **Parent lint lists** — `PARENT_MINI_MODULES` and `BACKEND_PARENT_MINI_MODULES` in `scripts/lib/parent-mini-modules.config.mjs` are **derived** from the registry (do not hand-edit).
3. **Barrel-only imports** — sibling mini-modules import via `../<slug>/index.js` only (see `lint:mini-modules`).
4. **Pipeline steps** — every `agentId` in `rule-discovery-pipeline-steps.js` must appear in some registry entry’s `logicalAgentIds` (or `human_review_gate` on `human-review`).
5. **Backend manifest** — every `backend.status: implemented` entry must have `backend/src/modules/ai-ops/<slug>/manifest.json`.
6. **Frontend barrel** — every non-`planned` frontend entry must have `frontend/src/modules/ai-ops/<slug>/index.js`.

## Per mini-module layout

### Backend (worker / assigner / orchestrator)

```text
backend/src/modules/ai-ops/<slug>/
├── manifest.json           ← id, kind, logicalAgentId(s), tools
├── index.js                ← public barrel
├── agents/*.machine.js     ← FSM (moduleAgentStateMachine contract)
├── services/               ← actions, domain logic
├── routes/                 ← optional HTTP surface
├── schemas/ | prompts/     ← optional
└── evals/                  ← optional golden tests
```

### Frontend (workbench + panels)

```text
frontend/src/modules/ai-ops/<slug>/
├── index.js                ← export agentMiniModule, WORKBENCH_PANEL_ORDER, UI barrels
├── components/             ← agent-specific panels (migrate from wireframe / overview)
├── services/               ← demo + API adapters for this agent only
└── data/                   ← optional demo fixtures
```

Shared cross-agent UI stays in infrastructure mini-modules: `agent-runs`, `shared`, `wireframe`, `rule-discovery` (pipeline chrome only).

## Logical agent → mini-module map (rule pipeline)

| Step | Logical agent id | Backend slug | Frontend slug |
|------|------------------|--------------|---------------|
| ingest | `agent_case_document_ocr_v1` | `parser-agent` + `ocr-agent` | `parser-agent`, `ocr` (legacy) |
| profile | `agent_case_identity_extractor_v1` | `extractor-agent` | `extractor-agent` |
| audit | `agent_rule_filing_audit_query_v1` | `filing-audit-agent` | `filing-audit-agent` |
| planner | `agent_rule_authority_v1` | `authority-planner-agent` (planned) | `authority-planner-agent` |
| research | `agent_rule_applicability_research_v1` | `rule-applicability-agent` | `rule-applicability-agent` |
| discovery | `agent_official_source_discovery_v1` | `source-discovery-agent` | `source-discovery-agent` |
| trusted / ingest_src | `agent_trusted_source_index_v1`, `agent_official_source_ingest_router_v1` | `source-crawler-agent` | `source-crawler-agent` |
| extract | `agent_ocr_placeholder_v1` | `extractor-agent` | `extractor-agent` |
| verify | `agent_source_verification_v1` | `source-verifier-agent` | `source-verifier-agent` |
| relevance | `agent_rule_relevance_v1` | `rule-relevance-agent` (planned) | `rule-relevance-agent` |
| human | `human_review_gate` | orchestrated by `rule-discovery-run` | `human-review` |
| persist | `agent_rule_filing_persist_v1` | `rule-filing-persist-agent` (planned) | `rule-filing-persist-agent` |

Run orchestration: **`rule-discovery-run`** (backend + frontend stub).

## Commands

```bash
npm run lint:pipeline-agent-mini-modules   # registry ↔ disk ↔ parent-mini-modules config
npm run lint:mini-modules --prefix backend  # barrel boundaries
npm run lint:architecture                   # includes mini-modules + boundaries
```

## Adding a new pipeline agent

1. Add an entry to `pipeline-agent-mini-modules.registry.json`.
2. Copy the file to `frontend/src/modules/ai-ops/shared/data/`.
3. Scaffold `backend/src/modules/ai-ops/<slug>/` with `manifest.json` + FSM if worker.
4. Scaffold `frontend/src/modules/ai-ops/<slug>/index.js` (stub).
5. Register in `agent-registry.manifest.json` when backend is implemented.
6. Add `agentId` to `rule-discovery-pipeline-steps.js`.
7. Run `npm run lint:pipeline-agent-mini-modules`.

## Migration notes

- **`ocr` → `ocr-agent`:** registry uses `frontend.legacySlug: "ocr"` until panels move; `ocr-agent/index.js` re-exports `ocr`.
- **Monolith panels:** `rule-discovery/`, `source-verification/`, etc. remain infrastructure/orchestration UI until split per agent.
