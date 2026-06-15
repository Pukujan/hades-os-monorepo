# Phase 3 Test Plan: Metadata Catalog

## Tests

### metadata-catalog.test.mjs

| # | Test | Expected | Notes |
|---|------|----------|-------|
| 1 | All 8 metadata catalog files exist | Pass when metadata/ files created | Red initially |
| 2 | Each metadata file is valid JSON | Pass when all files valid | |
| 3 | repo.json has required fields | Pass when repo has name, description | |
| 4 | catalog.json has required fields | Pass when catalog has catalogName, files[] | |
| 5 | modules.json has module inventory | Pass when modules[] has name, path | |
| 6 | tasks.json has task inventory | Pass when tasks[] has name, path | |
| 7 | contracts.json has contract registry | Pass when contracts[] has name | |
| 8 | apis.json has API registry | Pass when apis[] has name | |
| 9 | architecture-fitness.json has fitness fn registry | Pass when fitnessFunctions[] has name | |
| 10 | dependency-graph.json has dependency graph | Pass when modules[] and dependencies[] present | |

## Regression

- Phase 2 tests (contract-docs.test.mjs) must remain green
- Phase 0/1 regression (phase-0-1-regression.test.mjs) must remain green
- Phase 1 red tests: metadata catalog test changes from red to green; module manifest and generated index tests remain red
