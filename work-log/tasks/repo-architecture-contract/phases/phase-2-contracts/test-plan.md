# Test Plan: Phase 2 Contract Docs

## Test Files

1. `scripts/tasks/repo-architecture-contract/phases/phase-2-contracts/contract-docs.test.mjs` — Phase 2 contract doc tests
2. `scripts/tasks/repo-architecture-contract/phases/phase-2-contracts/phase-0-1-regression.test.mjs` — Phase 0/1 regression tests

## Test Cases (contract-docs.test.mjs)

| # | Test | Expected Phase 2 Result |
|---|------|------------------------|
| 1 | Phase 2 contract docs exist and contain required sections | TDD red → green |
| 2 | Phase 2 contracts registered in contract manifest | TDD red → green |
| 3 | Manifest contract docs exist on disk | TDD red → green |
| 4 | Changelog entry exists and changelog is valid JSONL | TDD red → green |
| 5 | Architecture overview references Phase 2 contracts | TDD red → green |
| 6 | Repo artifact layout references task/module/catalog architecture | TDD red → green |
| 7 | Phase 2 work-log artifacts exist | PASS |

## Test Cases (phase-0-1-regression.test.mjs)

All Phase 0 and Phase 1 tests must PASS (regression).

## Test Runner

```bash
npm run test:repo-architecture
```
