# Contract: ADR Lifecycle

**Version:** v001

## Purpose

Define how Architecture Decision Records (ADRs) are created, reviewed, approved, and maintained.

## Scope

ADR files under `docs/architecture/adr/`. Inline design notes and informal decisions are out of scope.

## Rules

1. ADRs are stored as Markdown files under `docs/architecture/adr/NNNN-title-with-dashes.md`.
2. Each ADR must include: Title, Status, Date, Context, Decision, Consequences.
3. Status values: `Proposed`, `Accepted`, `Deprecated`, `Superseded`.
4. An ADR may only move from `Proposed` → `Accepted` or `Proposed` → `Deprecated`.
5. A `Superseded` ADR must reference the ADR that supersedes it.
6. ADR numbers must not be reused. A deprecated ADR keeps its number.

## Required artifacts

- `docs/architecture/adr/` directory with at least one ADR
- `docs/architecture/adr/INDEX.md` — ADR registry

## Enforcement

Automated: a future lint script will validate ADR status transitions and required sections.

Manual: reviewers must verify new ADRs follow the naming convention and have all required sections.

## Non-goals

- Enforcing ADR content quality
- Automated ADR creation
- Formal RFC process integration
