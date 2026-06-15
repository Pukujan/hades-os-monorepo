# Phase 9 Test Plan

## Test File
`scripts/tasks/repo-architecture-contract/phases/phase-9-route-api-docs/route-api-docs.test.mjs`

## Tests (12 total)

| # | Test | What it checks | Passing criteria |
|---|------|----------------|-----------------|
| 1 | check-api-docs script exists | `scripts/check-api-docs.mjs` exists on disk | File exists |
| 2 | lint:api-docs package script registered | `package.json` has `lint:api-docs` → `scripts/check-api-docs.mjs` | Script key exists and references correct file |
| 3 | lint:repo-architecture includes lint:api-docs | Phase 9 wires api-docs into the repo-arch chain | `lint:api-docs` substring in script value |
| 4 | docs/hades/API.md documents all 19 Hades routes | Every route from `hades.routes.js` is present in module doc | All 19 methods+paths found |
| 5 | docs/API.md has all 19 Hades registry rows | Every full path (e.g. `GET \`/api/hades/minions\``) in master registry | All 19 table rows present |
| 6 | lint:api-docs passes | `npm run lint:api-docs` exits 0 | No throw |
| 7 | metadata/apis.json no pre-existing failures | Hades entries no longer have `pre-existing-api-doc-failures` | All hades entries != that status |
| 8 | metadata/architecture-fitness promotes api-doc-drift | `api-doc-drift` removed from deferred, added to implemented | Both assertions pass |
| 9 | repo-architecture lint green | `npm run lint:repo-architecture` exits 0 | No throw |
| 10 | Phase 9 work-log artifact: metadata.json | Exists on disk | File exists |
| 11 | Phase 9 work-log artifact: plan.md | Exists on disk | File exists |
| 12 | Phase 9 work-log artifact: test-plan.md | Exists on disk | File exists |
| 13 | PROJECT_PLAN.md Phase 9 present | Phase 9 mentioned in project plan | Content includes Phase 9 |

## Expected initial state (RED)
- Tests 4, 5, 6, 7, 8, 13 fail because docs/metadata are not yet updated
- Tests 1, 2, 10, 11, 12 pass (script and work-log exist)

## Expected final state (GREEN)
- All tests pass
- `npm run lint:repo-architecture` passes
- No backend/frontend runtime changes
