# Phase 11 Plan: CI/Final Acceptance

## Goal
Close the repo-architecture-contract milestone by adding the CI/final acceptance gate, creating FINAL_ACCEPTANCE.md, and promoting ci-final-acceptance from deferred to implemented checks.

## Steps
1. Create `scripts/tasks/repo-architecture-contract/phases/phase-11-final-acceptance/final-acceptance.test.mjs` (RED)
2. Update `package.json` `test:repo-architecture` to include phases 9, 10, 11
3. Confirm RED
4. Create `docs/tasks/repo-architecture-contract/FINAL_ACCEPTANCE.md`
5. Add `check:repo-architecture` npm script to `package.json`
6. Update `metadata/architecture-fitness.json` — promote ci-final-acceptance
7. Update `metadata/catalog.json` — reference FINAL_ACCEPTANCE.md
8. Create work-log artifacts (metadata.json, plan.md, test-plan.md, audit-log.md)
9. Update `PROJECT_PLAN.md` — Phase 11 → Complete
10. Update task metadata files — add phase-11 to activePhases
11. Update `agent_state.json`, regenerate `MEMORY.md`
12. Run full lint/test suite to confirm GREEN
13. Run `check_gate.py`

## Acceptance
- All 14 Phase 11 tests pass
- `npm run check:repo-architecture` passes
- `npm run lint:repo-architecture` passes
- `npm run test:repo-architecture` passes
- All architecture lints pass
