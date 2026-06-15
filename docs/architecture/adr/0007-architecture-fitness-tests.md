# ADR-0007: Architecture Fitness Tests

## Status

Accepted

## Context

Phase 8 requires architecture fitness functions to validate scaffold integrity. Without fitness functions, architectural drift can go undetected.

## Decision

Architecture fitness functions are implemented as Node.js scripts in `scripts/core/`. Each fitness function tests a specific architectural property (catalog consistency, contract completeness, dependency boundaries). Fitness functions are organized in `metadata/architecture-fitness.json` with deferred/implemented/promoted lifecycle tracking.

## Consequences

- Easier: automated fitness validation, clear lifecycle tracking for each fitness function.
- More difficult: fitness functions run as part of the lint chain, increasing lint runtime.
- Fitness test results are tracked in `metadata/architecture-fitness.json` for auditability.

## Links

- [ADR-0005](./0005-architecture-enforcement-lints.md)
- [ADR-0002](./0002-metadata-catalog-structure.md)
