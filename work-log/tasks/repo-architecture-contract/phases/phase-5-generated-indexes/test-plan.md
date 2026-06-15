# Test Plan: Phase 5 Generated Indexes

## Tests

| # | Test | Expected (Red) | Expected (Green) |
|---|------|----------------|-------------------|
| 1 | Generator script exists | Fail (no script) | Pass |
| 2 | Generator is deterministic (no Date/random) | Fail (no script) | Pass |
| 3 | 5 generated index files exist | All 5 fail | All 5 pass |
| 4 | Index files have warning header | All 5 fail | All 5 pass |
| 5 | Index files have content beyond header | All 5 fail | All 5 pass |
| 6 | Index files reference metadata sources | All 5 fail | All 5 pass |
| 7 | Indexes are deterministic (no timestamps) | All 5 fail | All 5 pass |
| 8 | package.json has generate:indexes | Fail (no script) | Pass |
| 9 | Work-log artifacts exist | All 4 fail | All 4 pass |

## Red-to-Green Steps

1. Create generator script → test 1,2 pass
2. Run generator → tests 3-7 pass
3. Add package.json script → test 8 pass
4. Create work-log files → test 9 pass

## Phase 1 Impact

After Phase 5 green, the "generated indexes exist (expected RED until Phase 5)" test in Phase 1 will also pass, reducing the expected red count to 0.
