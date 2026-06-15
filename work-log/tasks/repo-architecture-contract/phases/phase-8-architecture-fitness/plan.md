# Phase 8 Plan: Architecture Fitness Lints

## Goal
Add `lint:architecture-fitness` as a composite lint that validates the repo architecture scaffold is internally wired and enforceable, without touching API-doc drift.

## Steps
1. Create Phase 8 test file (TDD: red first)
2. Confirm red by running Phase 8 tests only
3. Create work-log artifacts (metadata.json, plan.md, test-plan.md, audit-log.md)
4. Restructure `metadata/architecture-fitness.json` with implementedChecks/deferredChecks/exclusions
5. Create `scripts/core/lint-architecture-fitness.mjs` with schema validation, dependency-graph cycle check, and script existence verification
6. Update `package.json` scripts (add lint:architecture-fitness, update lint:repo-architecture, test:repo-architecture)
7. Update PROJECT_PLAN.md and task metadata
8. Run all tests and lints to confirm all green
