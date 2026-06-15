# repo-architecture-contract

## Milestone Purpose

Upgrade the repo into a **metadata-driven contracted modular monolith** before the Hades/Hermes split.

This milestone creates canonical metadata files, module manifests, generated indexes, architecture fitness tests, and contract docs that define and enforce the repo architecture.

## Branch

```
refactor/repo-architecture-contract
```

Fallback: `codex/refactor-repo-architecture-contract`

## Rules

- **No runtime behavior changes.**
- **No deployment behavior changes.**
- **No auth behavior changes.**
- **No Hades UI/product behavior changes.**

## Process

- ChatGPT/Codex generates handoffs and red tests.
- OpenCode implements scoped phases.
- Handoffs live under `work-log/tasks/repo-architecture-contract/handoffs/`.
- TDD plans live under `work-log/tasks/repo-architecture-contract/phases/<phase>/test-plan.md`.
- Actual task tests live under `scripts/tasks/repo-architecture-contract/phases/<phase>/`.

## Phase Status

| Phase | Status |
|-------|--------|
| Phase 0 — Project Scope and Safety Metadata | Complete |
| Phase 1 — Red Tests | Active |
| Phase 2+ | Future |
