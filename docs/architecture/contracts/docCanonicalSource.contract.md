# Contract: Document Canonical Source

**Version:** v001

## Purpose

Define where authored documentation lives and how to avoid duplication between `docs/` and `additional-modules/docs/`.

## Scope

Files under `docs/` and `additional-modules/docs/`. This contract does not apply to generated documentation, README files co-located with source code, or third-party documentation.

## Rules

1. Every document has exactly one canonical path under `docs/`.
2. No file under `docs/` may duplicate content that exists in `additional-modules/docs/`.
3. `additional-modules/docs/` is the canonical home for agent/OpenCode-specific documentation only.
4. New documents must be placed under `docs/` unless they are strictly agent-internal.
5. Cross-references between `docs/` and `additional-modules/docs/` must use relative paths or explicit `../../additional-modules/docs/` prefixes.

## Required artifacts

- `docs/architecture/CONTRACTS_OVERVIEW.md` — architecture contract index
- `scripts/check-duplicate-docs.mjs` — lint script (future)

## Enforcement

Automated: duplicate doc detection runs as part of `test:repo-architecture` (audit-only in Phase 1, enforced in future phases).

Manual: reviewers must verify new docs do not duplicate existing content.

## Non-goals

- Deleting existing duplicate files (deferred to a future phase)
- Enforcing doc content style or formatting
- Cross-referencing generated docs
