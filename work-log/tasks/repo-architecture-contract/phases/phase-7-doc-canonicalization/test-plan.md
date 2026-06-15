# Phase 7 Test Plan: Doc Canonicalization

## Test File
`scripts/tasks/repo-architecture-contract/phases/phase-7-doc-canonicalization/doc-canonicalization.test.mjs`

## Positive Tests (should pass after implementation) — 7 tests
1. **Registry exists** — `docs/legacy-registry.json` is present and parseable JSON.
2. **Schema valid** — has numeric `schemaVersion`, string `canonicalRoot`, string `compatibilityRoot`, array `entries`.
3. **No blank canonical** — every entry has non-empty `canonical` and `compatibility` fields.
4. **Valid statuses** — every entry status is one of: pointer, generated, legacy, redirect, orphaned.
5. **All files classified** — every `.md` under `additional-modules/docs/` is either a pointer/generated doc by content marker or appears in registry entries.
6. **DEPLOY.md is pointer** — `additional-modules/docs/DEPLOY.md` contains a pointer/generated marker or canonical reference.
7. **lint:doc-canonical exits 0** — the strengthened lint script passes with the real registry.

## Negative Tests (should pass before and after implementation) — 5 tests
8. **Missing registry fails** — lint exits non-zero when `docs/legacy-registry.json` absent.
9. **Invalid schema fails** — lint exits non-zero with malformed registry.
10. **Unregistered doc fails** — lint exits non-zero when a `.md` file is unregistered and has no marker.
11. **Bad status fails** — lint exits non-zero with invalid entry status.
12. **No canonical ref fails** — lint exits non-zero with empty `canonical` field.

## Negative Test Strategy
Each negative test creates an isolated temp directory via `fs.mkdtempSync`, sets up minimal `docs/` and `additional-modules/docs/` structure, writes the scenario's registry/data files, runs the lint script with `LINT_ROOT` env var pointing to the temp dir, verifies non-zero exit and error message, then cleans up the temp dir.
