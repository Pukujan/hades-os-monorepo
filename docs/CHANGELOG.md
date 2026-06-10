# Changelog

All notable changes to `@pukujan/create-modular-monolith` are documented here.

## [2.4.0] - 2026-06-06

### Added

- **Parent module / mini-module architecture** — modules can now contain smaller single-responsibility sub-units with their own barrel exports, services, routes, and manifests
- **Registry-driven mini-modules** — `pipeline-agent-mini-modules.registry.json` declares all mini-modules; lint scripts enforce registry ↔ folder ↔ manifest alignment
- **3-layer memory system** — L1 `MEMORY.md` (working memory, <100 lines), L2 `AGENTS.md` (rules and boundaries), L3 `work-log/sessions/` (completed session archive)
- **Pre-built ai-ops parent module** — ships with 13 pipeline agent mini-modules and 8 infrastructure mini-modules (all generic, domain-agnostic)
- **`work-log/study-docs/`** — study documents with mermaid diagrams, token budgets, and context engineering notes

### Changed

- **Mini-module boundary enforcement** — `lint:mini-modules` enforces barrel-only sibling imports; no deep paths into sibling internals
- **Generic naming** — all pipeline agents renamed from legal-tech-specific slugs to generic names (e.g., `parser-agent` → `ingest-router`)
- **Scaffold is default** — mini-modules and context engineering are now the default scaffold, not optional

### Fixed

- **Registry alignment** — every mini-module folder must have a matching registry entry and manifest, enforced by `lint:architecture`

## [2.3.4] - 2026-05-31

### Changed

- **Planning layout** — each phase is a dated folder `work-log/planning/{NNN}_{date}_{time}_{slug}/` containing `audit-log.md`, `plan.md`, and optional `design.md`; manifest JSON stays at `planning/` root
- **`plan:gate` / `plan:finalize`** — default `--plan-id` resolves to the latest matching plan folder for the slug (legacy flat `*_audit-log_*` files still work)
- **Terminology** — planning conversation command is `/planning-audit-log`; study logs are a separate owner-only folder, not gated by `plan:gate`

### Added

- **`work-log/study-logs/`** — personal portfolio notes; included in repo but agents must not read or write (`.agents/rules/study-logs-user-only.mdc`)
- **`scripts/lib/plan-folder.mjs`** — folder naming helpers for planning artifacts
- Starter export copies `study-logs/` README

## [2.3.3] - 2026-05-31

### Fixed

- **`plan:gate` / `plan:finalize`** — omitting `--plan-id` no longer reads `process.argv[0]` as the plan id (manifest paths like `node.exe.json` on Windows)
- **`dev-log:pre-push`** — starter boilerplate no longer crashes when pipeline/prompt registries are null
- **Planning paths** — consolidated planning audit logs, design, and plan packages into `work-log/planning/` (removed `study-docs/` split)
- **Terminology** — planning gate files are **audit logs** (`*_audit-log_*`, `/planning-audit-log`); study logs are a separate concept, not gated by `plan:gate`
- **Windows** — planning manifest paths use forward slashes; `agent:push` git commit no longer splits on spaces in the message

### Added

- **`npm run agent:push`** — agent workflow: create dev logs, commit pair, then push
- **`npm run smoke:gates`** — smoke tests for planning gate and agent push gate
- **Agent hooks** — `.agents/hooks.json` blocks bare agent `git push` without paired dev logs
- **`.agents/commands/push.md`** and **`agent-push-dev-log`** rule for push requests

### Notes

- Terminal `git push` by the user remains allowed without dev logs; enforcement is for agent shell pushes only.

## [2.3.2] - 2026-05-29

### Added

- Post-install welcome message pointing to GitHub + npm (`scripts/postinstall-message.mjs`, scaffold CLI output, once per project on `backend` install)

### Changed

- **License** — root and `template/` switched from proprietary platform license to **MIT** (Copyright (c) 2026 Pukujan)
- `package.json` `license` field set to `MIT`
- `template/NOTICE` — optional scaffold credit (no longer required attribution)

## [2.3.1] - 2026-05-29

### Changed

- Expanded root **README** for npm: install, requirements, post-scaffold layout, env vars, implementing 2.3.0 contracts, maintainer publish steps
- Corrected `npm create` package name to `@pukujan/create-modular-monolith`
- `package.json` description and keywords for registry search

## [2.3.0] - 2026-05-29

### Added

- **Architecture contracts (v001)** — `documentPersistence`, `moduleAgentStateMachine`, `asyncJobQueue` in `manifest.json` with implementation templates under `docs/architecture/templates/`
- **Shared agent runtime** — `backend/src/shared/agent-runtime/createAgentRuntime.js` + tests
- **Document storage helpers** — `resolveDocumentStoragePaths.js` + tests; `data/uploads/.gitkeep`
- **`npm run condense-contracts`** — bundles all manifest contracts into `file-exchange/exports/consolidated-contracts.json` (wired into `condense:all`)
- **`local-artifacts.example.json`** — optional external artifact root + layout keys
- **Module scaffold** — `agents/` layer in `new:module` output; `lint:layers` recognizes `agents/`

### Changed

- **CONTRACTS_OVERVIEW** — starter catalog lists 9 manifest IDs only; product-only contracts moved out of boilerplate table
- **condense-contracts** — repo-relative paths in export JSON; `repositoryRoot: "."`
- **architecturePushDevLog** — documented as maintainer-repo-only (not in starter `manifest.json`)
- Frontend starter — removed default `index.css` / `className` styling from reference module shell

### Notes

- Contracts are **spec + templates** only — no `documents` module, BullMQ deps, or upload API wired in yet (Phase 1 is your project’s job).

## [2.2.5] - 2026-05-24

### Added

- **Planning gate** — `plan:finalize`, `plan:gate`, `work-log/planning/` manifests; study log required before build (`planningPhase` contract)
- **Architecture push logs** — `arch-log:push` / `arch-log:verify` contract docs in template (product repo runs export audit)
- `formatHumanReadableUtc` for work-log headers; `fileExchangeCleanup`, `zipDirectory` platform utils
- Starter templates: planning study-log command, updated `AGENTS.md` and work-log README

### Changed

- Export script sync from `legal-prmpt-eng` @ `d696d6e` (planning + arch-push contracts)

## [2.2.3] - 2026-05-23

### Fixed

- Removed litigation-domain consolidated artifacts and model condenser from template
- Starter export: generic prompts condenser, platform-only model inventory, `treeText`-only file structure
- `TREE_IGNORE_PREFIXES` in starter is `["data"]` only (not product batch paths)

## [2.2.2] - 2026-05-23

### Fixed

- `node --test` without shell globs — fixes CI on Linux (quoted `**` paths are literal on Ubuntu)

## [2.2.1] - 2026-05-23

### Changed

- Replaced MIT with **Pukujan Modular Monolith Platform License** (proprietary, all rights reserved)
- Required attribution when retaining substantial platform files from the template
- Scaffold now includes `template/LICENSE` and `template/NOTICE` for generated projects

## [2.2.0] - 2026-05-23

### Added

- Template: GitHub Actions CI (`.github/workflows/ci.yml`) and `npm run test:ci`
- `docs/architecture/EVAL_AND_CI.md` — gates, regression, golden-is-per-case (not universal)
- `backend/src/shared/utils/traceId.js` for batch/document correlation
- `model-condenser` exempt from false-positive boundary lint (path inventory strings)

### Changed

- Synced platform scripts and docs from litigation-prompt-engineering (architecture layer only)
- Generic `api-inventory.mjs` and `condense-prompts.mjs` (no case-filing-ai dependency)
- Starter `lint:repo-artifacts` paths for platform-only layout

## [2.1.0] - 2026-05-23

### Added

- Architecture-only template: `_reference`, `model-condenser`, no domain modules
- `docs/architecture/PLATFORM_ARCHITECTURE.md` — agent-scale platform narrative
- Contract manifest v001: file exchange, consolidated exports, pre-push dev logs, API registry
- Scripts: `lint:contracts`, `dev-log:pre-push`, `condense:all`, `import:file-exchange`, `new:module`
- Agent config: `AGENTS.md`, `.agents/rules`, `.agents/commands/pre-push-dev-log.md`
- Generic `api-inventory.mjs` (no domain pipeline imports)

### Changed

- Bumped from 2.0.0 — aligns with litigation-prompt-engineering v3 architecture platform

## [2.0.0]

- Initial npm publish (minimal template)
