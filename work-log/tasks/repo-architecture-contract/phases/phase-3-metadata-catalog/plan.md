# Phase 3 Plan: Metadata Catalog

## Goal
Create the `metadata/` directory with 8 JSON files that index the repo's modules, tasks, contracts, APIs, and architecture fitness checks.

## Files to Create

1. `metadata/repo.json` — repo-level metadata (name, description)
2. `metadata/catalog.json` — cross-catalog index (catalogName, files)
3. `metadata/modules.json` — module inventory with transition/pending status markers
4. `metadata/tasks.json` — task inventory
5. `metadata/contracts.json` — contract registry mirroring manifest.json
6. `metadata/apis.json` — API endpoint registry with transition markers
7. `metadata/architecture-fitness.json` — fitness function registry
8. `metadata/dependency-graph.json` — module dependency graph

## Steps

1. Create Phase 3 test file (TDD — red first)
2. Confirm tests are red (metadata/ doesn't exist yet)
3. Create all 8 metadata/ JSON files
4. Update package.json to include Phase 3 tests in test:repo-architecture
5. Update PROJECT_PLAN.md (Phase 3 → In Progress/Complete)
6. Update Phase 1 red test expected-RED message from Phase 2 → Phase 3
7. Re-run all tests — confirm green
8. Run lints — confirm no regressions
9. Update agent_state and MEMORY.md, archive session
