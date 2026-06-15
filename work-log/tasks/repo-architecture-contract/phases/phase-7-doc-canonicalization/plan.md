# Phase 7 Plan: Doc Canonicalization & Legacy Registry

## Goal
Create `docs/legacy-registry.json` mapping every `additional-modules/docs/**/*.md` file to its canonical `docs/` counterpart, and strengthen `lint:doc-canonical` to validate registry schema, entry completeness, and full coverage.

## Steps

1. Create `docs/legacy-registry.json` with 28 entries (all Markdown files under `additional-modules/docs/` have canonical counterparts in `docs/`).
2. Strengthen `scripts/core/lint-doc-canonical-source.mjs` to:
   - Validate registry exists, parseable, and schema-conformant
   - Check every entry has non-empty `canonical` and `compatibility` fields
   - Check every entry has valid `status` (pointer/generated/legacy/redirect/orphaned)
   - Walk `additional-modules/docs/` and verify every `.md` file is either a pointer/generated doc by content marker or registered in the legacy registry
   - Accept `LINT_ROOT` env var for testing with temp directories
3. Create Phase 7 test file with 12 test cases (6 positive, 6 negative).
4. Update `package.json` `test:repo-architecture` to include Phase 7.
5. Run `npm run test:repo-architecture` and confirm all 12 tests pass alongside previous phases.

## Non-goals
- Deleting any files from `additional-modules/docs/`
- Editing content of any `additional-modules/docs/` files (except DEPLOY.md already has pointer marker)
- Editing `docs/architecture/contracts/**`
- Changing runtime or deployment behavior
