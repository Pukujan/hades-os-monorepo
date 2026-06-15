# Contract: Architecture Fitness

**Version:** v001

## Purpose

Define how architecture fitness functions are authored, registered, and executed to prevent architectural drift.

## Scope

Architecture fitness functions under `scripts/` and the `backend/src/modules/*/tests/architecture/` directories.

## Rules

1. Each fitness function is a standalone test or lint script.
2. Fitness functions must exit non-zero on failure.
3. Fitness functions must be registered in `metadata/architecture-fitness.json`.
4. Each fitness function must have a doc comment or README explaining which architectural property it guards.
5. Fitness functions must not depend on runtime services (database, queue, external APIs).

## Required artifacts

- `scripts/lint-architecture.mjs` — composite architecture lint
- `backend/src/modules/*/tests/architecture/` — per-module fitness tests

## Enforcement

Automated: `lint:architecture` runs all registered fitness functions. `test:repo-architecture` includes fitness function registration checks.

Manual: add a new fitness function when a new architectural rule is introduced.

## Non-goals

- Replacing existing linters (ESLint, Prettier)
- Performance benchmarking as fitness
- Fitness functions that modify source code
