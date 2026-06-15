# Phase 5 Plan: Generated Indexes

## Goal

Generate INDEX.md files at key documentation/script/work-log roots from metadata JSON sources using a deterministic generator script.

## Steps

1. Create Phase 5 test file (generated-indexes.test.mjs) — validates generator exists, 5 index files exist, header, content, determinism, package.json script, work-log artifacts
2. Create work-log files (metadata.json, plan.md, test-plan.md, audit-log.md)
3. Run tests — confirm red (generator and indexes don't exist)
4. Create generator scripts/core/generate-repo-indexes.mjs
5. Add generate:indexes package.json script
6. Generate 5 index files (docs/INDEX.md, docs/modules/INDEX.md, docs/tasks/INDEX.md, scripts/tasks/INDEX.md, work-log/tasks/INDEX.md)
7. Update PROJECT_PLAN.md (Phase 5 → In Progress, then Complete)
8. Update Phase 1 red test message for generated indexes
9. Update test:repo-architecture to include Phase 5 test
10. Run all tests and checks

## Acceptance

```bash
npm run test:repo-architecture
# Phase 5 tests pass
# Phase 4 still green
# Phase 3 still green
# Phase 2 still green
# Phase 0/1 still green
# Phase 1 red count reduces from 1 to 0 (generated indexes now pass)
```
