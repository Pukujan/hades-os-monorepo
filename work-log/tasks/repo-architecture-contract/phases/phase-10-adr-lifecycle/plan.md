# Phase 10: ADR Lifecycle

## Objective
Create Architecture Decision Records (ADRs) documenting architecture decisions made during Phases 2–9, add ADR lifecycle enforcement via `lint-adr-lifecycle.mjs`, and promote `adr-lifecycle` from deferred to implemented checks.

## Scope
- **ADR docs only**: `docs/architecture/adr/README.md`, `docs/architecture/adr/INDEX.md`, 8 ADR files
- **Metadata only**: `metadata/adrs.json`, `metadata/catalog.json`, `metadata/architecture-fitness.json`
- **Lint only**: `scripts/core/lint-adr-lifecycle.mjs`
- **Wiring only**: `package.json` (add `lint:adr-lifecycle` to `lint:repo-architecture`)
- **Cleanup**: Phase 9 `api-doc-drift` description update to clarify enforcement chain
- **No runtime changes**: Backend, frontend, auth, Hades UI remain untouched

## Preconditions
- Phase 9 complete (11/11 tests pass, `lint:api-docs` passes, `lint:repo-architecture` passes)
- Phase 8 green (9/9 tests pass)
- Full lint chain green

## Steps
1. Create Phase 10 test file `adr-lifecycle.test.mjs` (23 tests)
2. Create Phase 10 work-log artifacts (metadata.json, plan.md, test-plan.md, audit-log.md)
3. Create `docs/architecture/adr/README.md` with status values and rules
4. Create `docs/architecture/adr/INDEX.md` as ADR registry
5. Create 8 ADR files (ADR-0001 through ADR-0008) documenting decisions from Phases 2–9
6. Create `metadata/adrs.json` with all 8 ADR entries
7. Update `metadata/catalog.json` — add ADRs section
8. Update `metadata/architecture-fitness.json` — promote `adr-lifecycle` from deferred to implemented; update `api-doc-drift` description
9. Create `scripts/core/lint-adr-lifecycle.mjs`
10. Update `package.json` — add `lint:adr-lifecycle`, append to `lint:repo-architecture`
11. Run Phase 10 test suite (expect green)
12. Run prior phase tests (confirm no regression)
13. Update `PROJECT_PLAN.md`
14. Archive session artifacts

## Verification
- `npm run lint:adr-lifecycle` → exit 0
- `npm run lint:repo-architecture` → exit 0
- `node --test scripts/tasks/repo-architecture-contract/phases/phase-10-adr-lifecycle/adr-lifecycle.test.mjs` → all pass
- All prior phase tests remain green
- Full lint chain passes

## Expected outcomes
- 8 ADRs documenting decisions from Phases 2–9
- `adr-lifecycle` check promoted to implemented with script `lint:adr-lifecycle`
- ADR structure and lifecycle enforced via lint
- `api-doc-drift` description clarifies enforcement through `lint:repo-architecture` via `lint:api-docs`
