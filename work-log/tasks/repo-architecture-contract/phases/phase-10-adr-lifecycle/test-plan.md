# Phase 10 Test Plan

## Test File
`scripts/tasks/repo-architecture-contract/phases/phase-10-adr-lifecycle/adr-lifecycle.test.mjs`

## Tests (23 total)

| # | Test | What it checks | Passing criteria |
|---|------|----------------|-----------------|
| 1 | ADR directory exists | `docs/architecture/adr/` directory on disk | Directory exists |
| 2 | ADR README exists with status values and rules | `README.md` in adr directory mentions ADR and all 4 status values | File exists, content includes statuses |
| 3 | ADR INDEX.md exists as ADR registry | `INDEX.md` lists all 8 ADRs | File exists, references each ADR id |
| 4-11 | ADR file ADR-NNNN exists | Each of 8 ADR files in `docs/architecture/adr/` | At least one file per ADR id |
| 12 | Each ADR has required sections | All ADR files have `# ADR-`, `## Status`, `## Context`, `## Decision`, `## Consequences`, `## Links` | All sections present, status is valid |
| 13 | metadata/adrs.json exists and is valid JSON | File on disk, parseable JSON with `adrs` array | File exists and parses |
| 14 | metadata/adrs.json references all required ADRs | All 8 ADRs present with id, title, status, path, phase | All entries complete, status valid |
| 15 | metadata/catalog.json references ADRs | Catalog JSON contains "adr" or "adrs" substring | String match |
| 16 | metadata/architecture-fitness promotes adr-lifecycle | `adr-lifecycle` removed from deferred, added to implemented | Both assertions pass |
| 17 | lint-adr-lifecycle.mjs script exists | `scripts/core/lint-adr-lifecycle.mjs` on disk | File exists |
| 18 | package.json registers lint:adr-lifecycle | Script key exists and references correct file | Both assertions pass |
| 19 | lint:repo-architecture includes lint:adr-lifecycle | Phase 10 wires adr-lifecycle into the repo-arch chain | Substring match |
| 20 | lint:adr-lifecycle passes | `npm run lint:adr-lifecycle` exits 0 | No throw |
| 21 | lint:repo-architecture remains green | `npm run lint:repo-architecture` exits 0 | No throw |
| 22 | Phase 10 work-log artifacts exist | metadata.json, plan.md, test-plan.md, audit-log.md | All 4 files exist |
| 23 | Project plan marks Phase 9 complete and Phase 10 present | Phase 9 = Complete, Phase 10 mentioned | Both assertions pass |

## Expected initial state (RED)
- Tests 2–21 fail because ADR docs/metadata/scripts are not yet created
- Tests 1, 22, 23 partially fail (some artifacts missing)

## Expected final state (GREEN)
- All 23 tests pass
- `npm run lint:repo-architecture` passes
- No backend/frontend runtime changes
