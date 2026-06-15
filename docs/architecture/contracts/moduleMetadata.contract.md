# Contract: Module Metadata

**Version:** v001

## Purpose

Standardize the `module.json` file format that every backend/frontend module must provide to declare its identity, boundaries, and public API.

## Scope

All modules under `backend/src/modules/` and `frontend/src/modules/`. The `_reference/` template module is included.

## Rules

1. Every module directory must contain a `module.json` file at its root.
2. `module.json` must be valid JSON (not JSONC).
3. Required fields: `name`, `version`, `type`, `runtime`, `publicApi`, `dependencies`.
4. `publicApi` must list every file or path that other modules are permitted to import.
5. `dependencies` must list every module this module directly depends on (not transitive).
6. Field values must be strings or arrays of strings; no nested objects.
7. Module names must match the directory name (kebab-case).
8. Version must follow semver.

## Required artifacts

- `backend/src/modules/*/module.json` — backend module manifests
- `frontend/src/modules/*/module.json` — frontend module manifests

## Enforcement

Automated: `lint:boundaries` currently validates intra-module import rules. Phase 3 will add a `lint:module-metadata` script that validates `module.json` structure.

Manual: reviewers must verify new modules create a `module.json`.

## Non-goals

- Validating actual source code against the publicApi declarations
- Transitive dependency resolution
- JSON schema generation
