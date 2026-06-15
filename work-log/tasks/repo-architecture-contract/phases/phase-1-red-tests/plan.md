# Phase 1 Plan: Red Tests

## Goal

Create red tests that define the target architecture state for the repo-architecture-contract milestone.

These tests are expected to fail initially.

## Checks

1. Task metadata exists (scripts/tasks, work-log/tasks, docs/tasks)
2. Phase metadata exists
3. Future metadata files missing or incomplete (metadata/*.json) — now green (Phase 3 complete)
4. Future module manifests missing or incomplete — now green (Phase 4 complete)
5. Future generated indexes missing or incomplete
6. Future contract docs missing or incomplete
7. Duplicate authored docs risk (docs/ vs additional-modules/docs/)
8. Package scripts exist

## Acceptance

```bash
npm run test:repo-architecture
```

Expected: intentional failures with meaningful messages.
