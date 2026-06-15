# Test Plan: Phase 1 Red Tests

## Test File

```
scripts/tasks/repo-architecture-contract/phases/phase-1-red-tests/repo-architecture-contract.test.mjs
```

## Test Cases

| # | Test | Expected Phase 1 Result |
|---|------|------------------------|
| 1 | Task metadata files exist | PASS (created in Phase 0) |
| 2 | Phase metadata files exist | PASS (created in Phase 0) |
| 3 | Future metadata catalog files exist | FAIL (red — implemented in Phase 2+) |
| 4 | Future module manifests exist | PASS (implemented in Phase 4) |
| 5 | Future generated indexes exist | FAIL (red — implemented in Phase 5+) |
| 6 | Future contract docs exist | FAIL (red — implemented in Phase 5+) |
| 7 | Duplicate authored docs detection | PASS/INFO (audit only) |
| 8 | Package scripts exist | PASS (added in Phase 0/1) |

## Runner

```bash
npm run test:repo-architecture
```
