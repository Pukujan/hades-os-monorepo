# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) documenting key architecture decisions made during the repo-architecture-contract milestone.

## Status Values

| Status | Meaning |
|--------|---------|
| Accepted | The decision has been implemented and is currently in effect |
| Proposed | The decision is under consideration and has not been implemented |
| Deprecated | The decision was previously accepted but is no longer in effect |
| Superseded | The decision was replaced by a newer decision |

## Structure

Each ADR follows this format:

```markdown
# ADR-NNNN: Title

## Status

[Accepted | Proposed | Deprecated | Superseded]

## Context

What is the issue that we're seeing that is motivating this decision or change?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

What becomes easier or more difficult to do because of this change?

## Links

- [Related ADR](./ADR-NNNN.md)
- [Related Contract](../contracts/example.contract.md)
```

## Rules

1. Each ADR must have a unique sequential number (NNNN).
2. ADR numbers must not be reused.
3. An `INDEX.md` file in this directory lists all ADRs.
4. ADR status must be one of: Accepted, Proposed, Deprecated, Superseded.
5. Superseded ADRs must link to the superseding ADR.
6. All ADRs must be registered in `metadata/adrs.json`.
