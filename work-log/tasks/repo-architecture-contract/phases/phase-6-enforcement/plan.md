# Phase 6 Plan: Architecture Enforcement Lints

## Goal

Add executable enforcement lints for the architecture artifacts that now exist, turning the scaffold into a documented + tested + lint-enforced repo contract.

## Steps

1. Create Phase 6 test file (enforcement-lints.test.mjs) — validates lint scripts exist, package scripts registered, lints run, work-log artifacts, project plan status
2. Create work-log files (metadata.json, plan.md, test-plan.md, audit-log.md)
3. Run tests — confirm red (lint scripts and package scripts don't exist)
4. Create 4 core lint scripts:
   - scripts/core/lint-doc-canonical-source.mjs
   - scripts/core/lint-task-artifacts.mjs
   - scripts/core/lint-module-metadata.mjs
   - scripts/core/lint-repo-catalog.mjs
5. Add package.json scripts for the 4 lints + lint:repo-architecture composite
6. Update activePhases metadata
7. Update PROJECT_PLAN.md (Phase 5 → Complete, Phase 6 → Complete)
8. Re-run all tests and lint checks

## Acceptance

```bash
npm run test:repo-architecture
# Phase 6 tests pass
# Phase 0-5 remain green

npm run lint:doc-canonical && npm run lint:task-artifacts && npm run lint:module-metadata && npm run lint:repo-catalog
# All 4 lints pass

npm run lint:repo-architecture
# Composite passes

npm run lint:contracts && npm run lint:repo-artifacts && npm run lint:boundaries
# Existing lints still pass
```
