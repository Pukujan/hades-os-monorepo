# ADR-0001: Contract Document Format

## Status

Accepted

## Context

Phase 2 of the repo-architecture-contract milestone requires documenting architecture contracts in a structured, machine-parseable format. Without a consistent format, contracts would be ad-hoc and difficult to validate programmatically.

## Decision

Contract documents follow the `.contract.md` convention with a standard header block including contract id, title, status, and version. Each contract is stored in `docs/architecture/contracts/` and validated against a corresponding lint script.

## Consequences

- Easier: automated validation of contract structure, cross-referencing between documents.
- More difficult: changing contract format requires updating multiple lint scripts.
- Contracts are self-documenting and human-readable.

## Links

- [Contract Overview](../contracts/README.md)
