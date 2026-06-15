# ADR-0006: Doc Canonicalization

## Status

Accepted

## Context

Phase 7 introduces the requirement that every document in `docs/` must have a canonical source. Multiple copies or derived versions of documents can lead to inconsistencies.

## Decision

Each document in `docs/` registers a canonical source path in its metadata. Derived documents (such as INDEX.md) reference the canonical source. The `lint:repo-architecture` chain enforces that all registered documents exist and that no unregistered documents exist in `docs/`.

## Consequences

- Easier: clear ownership of each document, automated drift detection between copies.
- More difficult: every new document must be registered in metadata before creation.
- The catalog (`metadata/catalog.json`) is the registration authority.

## Links

- [ADR-0002](./0002-metadata-catalog-structure.md)
- [ADR-0004](./0004-generated-index-strategy.md)
