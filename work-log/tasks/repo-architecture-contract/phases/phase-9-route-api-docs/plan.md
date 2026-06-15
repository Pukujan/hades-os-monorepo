# Phase 9: Route/API Docs Drift Cleanup

## Objective
Fix all 11 pre-existing `lint:api-docs` failures for Hades minions/notifications endpoints. Add route manifest (`docs/modules/hades/routes.json`) for the Hades module. Wire `lint:api-docs` into the `lint:repo-architecture` chain. Update metadata to reflect resolved status.

## Scope
- **Docs only**: `docs/API.md`, `docs/hades/API.md`
- **Metadata only**: `metadata/apis.json`, `metadata/architecture-fitness.json`
- **Wiring only**: `package.json` (add `lint:api-docs` to `lint:repo-architecture`)
- **No runtime changes**: Backend, frontend, auth, Hades UI remained untouched

## Preconditions
- Phase 8 complete (81 repo-architecture tests pass, `lint:architecture-fitness` passes)
- Phase 8 audit-log confirms api-docs deferred to Phase 9
- `lint:api-docs` currently fails with 11 errors (6 routes x 2 checks each minus one pre-documented in master)

## Steps
1. Capture `npm run lint:api-docs` output (baseline)
2. Create `scripts/tasks/repo-architecture-contract/phases/phase-9-route-api-docs/route-api-docs.test.mjs`
3. Add 6 missing routes to `docs/hades/API.md`
4. Add 6 missing rows to `docs/API.md` Endpoint registry
5. Update `metadata/apis.json` — remove `pre-existing-api-doc-failures` from hades entries, add `routeManifest` reference
6. Update `metadata/architecture-fitness.json` — promote `api-doc-drift` from deferred to implemented
7. Add `lint:api-docs` to `lint:repo-architecture` in `package.json`
8. Run Phase 9 test suite (expect green)
9. Run Phase 8 test suite (confirm no regression)
10. Update PROJECT_PLAN.md
11. Archive session artifacts

## Verification
- `npm run lint:api-docs` → exit 0
- `npm run lint:repo-architecture` → exit 0
- `node --test scripts/tasks/repo-architecture-contract/phases/phase-9-route-api-docs/route-api-docs.test.mjs` → all pass
- `node --test scripts/tasks/repo-architecture-contract/phases/phase-8-architecture-fitness/architecture-fitness.test.mjs` → no regression

## Expected outcomes
- All 19 Hades routes documented in both `docs/hades/API.md` and `docs/API.md`
- `metadata/apis.json` hades entries transition from `pre-existing-api-doc-failures` to `api-docs-complete`
- `api-doc-drift` check promoted to implemented with script `lint:api-docs`
- Gate no longer blocked by api-docs
