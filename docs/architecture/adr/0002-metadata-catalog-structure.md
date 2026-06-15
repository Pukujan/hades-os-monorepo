# ADR-0002: Metadata Catalog Structure

## Status

Accepted

## Context

Phase 3 requires a centralized metadata store to track the state of architecture components. Without it, lint scripts and tooling have no canonical source of truth for what exists in the project.

## Decision

A `metadata/` directory at the project root contains JSON files. Each JSON file represents a metadata domain (catalog, contracts, fitness, manifest). The catalog (`catalog.json`) is the root of truth, enumerating all architecture components.

## Consequences

- Easier: single source of truth for architecture metadata, simple JSON parsing in Node.js lint scripts.
- More difficult: metadata must be kept in sync with actual files; no automatic drift detection.
- The catalog serves as the entry point for architecture fitness functions.

## Links

- [ADR-0001](./0001-contract-document-format.md)
