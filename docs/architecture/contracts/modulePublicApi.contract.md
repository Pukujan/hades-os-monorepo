# Contract: Module Public API

**Version:** v001

## Purpose

Define how each module declares its public API surface and how cross-module imports are constrained.

## Scope

Source files in `backend/src/modules/` and `frontend/src/modules/`. Intra-module imports are not constrained by this contract.

## Rules

1. Each module's `module.json` `publicApi` array lists the entry points other modules may import.
2. Cross-module imports outside the declared `publicApi` are violations.
3. A module may only depend on modules listed in its `dependencies` array.
4. Circular dependencies between modules are forbidden at the module level.
5. Public API entry points must be single files (not directories).
6. Re-exports via a consolidated `index.js` or `index.mjs` are preferred.

## Required artifacts

- `module.json` files with `publicApi` and `dependencies` arrays

## Enforcement

Automated: `lint:boundaries` enforces cross-module import rules.

Manual: code reviewers must verify new imports reference only declared public API paths.

## Non-goals

- Validating that public API files actually export what they claim
- Type-level API compatibility checks
- Versioning individual API surfaces
