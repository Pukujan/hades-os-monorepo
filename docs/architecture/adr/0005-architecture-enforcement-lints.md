# ADR-0005: Architecture Enforcement Lints

## Status

Accepted

## Context

Phase 6 requires automated enforcement of architecture contracts. Manual review is error-prone and does not scale as the codebase grows.

## Decision

Node.js scripts under `scripts/core/` implement architecture lint checks. Each script focuses on a single concern (contract structure, repo catalog, fitness, boundaries, layers). Scripts are wired together via npm scripts with `lint:` prefix, composed into the `lint:repo-architecture` chain.

## Consequences

- Easier: automated enforcement, composable scripts, easy to add new checks.
- More difficult: each new check requires a new script and npm script registration.
- Scripts use only Node.js built-ins to avoid dependency management overhead.

## Links

- [ADR-0002](./0002-metadata-catalog-structure.md)
- [ADR-0004](./0004-generated-index-strategy.md)
