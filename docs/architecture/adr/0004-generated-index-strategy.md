# ADR-0004: Generated Index Strategy

## Status

Accepted

## Context

Phase 5 requires INDEX.md files for documentation directories to provide navigation and structural overview. Without INDEX.md files, finding documents requires knowing the file tree manually.

## Decision

INDEX.md files in documentation directories auto-generated via `scripts/core/lint-repo-catalog.mjs`. Each INDEX.md lists subdirectories and document files with brief descriptions, regenerated when catalog metadata changes.

## Consequences

- Easier: automatic navigation, always up-to-date listing of documents.
- More difficult: INDEX.md must not be manually edited; edits are overwritten on regeneration.
- INDEX.md is checked into version control to provide immediate navigation in GitHub.

## Links

- [ADR-0002](./0002-metadata-catalog-structure.md)
- [ADR-0006](./0006-doc-canonicalization.md)
