# Phase 4 Plan: Module Manifests

## Goal

Add `module.json` manifests for all active backend/frontend modules and update metadata to reflect them.

## Steps

1. Create Phase 4 test file (module-manifests.test.mjs) — validates 6 module.json files, metadata references, dependency graph, catalog, and work-log artifacts
2. Create work-log files (metadata.json, plan.md, test-plan.md, audit-log.md)
3. Run tests — confirm red (module.json files don't exist)
4. Create 6 module.json manifests
5. Update metadata/modules.json — remove pending-module-json, reference real manifest paths
6. Update metadata/dependency-graph.json — add nodes for each module
7. Update metadata/catalog.json — add module catalog entries
8. Update package.json to include Phase 4 test
9. Update PROJECT_PLAN.md (Phase 4 → Complete)
10. Update Phase 1 red test message for module manifests
11. Run all tests and checks

## Acceptance

```bash
npm run test:repo-architecture
# Phase 4 tests pass
# Phase 3 still green
# Phase 2 still green
# Phase 0/1 still green
# Phase 1 red count reduces from 2 to 1 (generated indexes only)
```
