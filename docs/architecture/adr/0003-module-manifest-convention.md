# ADR-0003: Module Manifest Convention

## Status

Accepted

## Context

Phase 3 introduces the concept of modules to organize architecture components. Each module needs a metadata file describing its purpose, contracts, and dependencies.

## Decision

Each module gets a `module.json` file placed in its root directory. The `module.json` contains `id`, `title`, `description`, `contracts` (array of contract paths), and `dependencies` (array of module ids). Modules live under `docs/architecture/modules/`.

## Consequences

- Easier: clear module boundaries, explicit dependency declarations for cycle detection.
- More difficult: adding a module requires creating a `module.json` manually.
- Module manifests enable automated dependency graph generation.

## Links

- [ADR-0002](./0002-metadata-catalog-structure.md)
