# Work log

Planning artifacts for this repo: **what to build** (handoffs) and **how we decided** (study docs + planning phases).

```text
work-log/
  README.md       ← you are here
  INDEX.md        ← full index (handoffs + planning + dev-logs + sessions + checkpoints)
  handoffs/       ← numbered specs, starter packs (002, 005, …)
  study-docs/     ← USER ONLY — personal study logs (agents do not touch)
  planning/       ← phase folders: plan-log + audit-log + manifest (planningPhase contract)
  checkpoints/    ← runtime proof only (e.g. batch-002 eval evidence), not conversation
  dev-logs/       ← pre-push audit: human/ + agent/ (paired per push) — what shipped
  sessions/       ← per-session work summaries and decisions (archived from MEMORY.md)
  architecture-push-logs/  ← npm export to create-modular-monolith only (separate from dev-logs)
```

## When to use which folder

| Folder | Put here | Agents |
|--------|----------|--------|
| **handoffs/** | Implementation specs, second/third handoffs, starter pack snapshots | Yes |
| **study-docs/** | Personal planning conversation — study logs (`You` verbatim + summaries) | **No — user only** |
| **planning/** | Phase folders with `plan-log.md`, `audit-log.md`, `manifest.json` ([planning-plan-package](../agents/commands/planning-plan-package.md), [planningPhase contract](../docs/architecture/contracts/planningPhase.contract.md)) | Yes |
| **checkpoints/** | Post-run evidence (batch evals, pass/fail tables) | Yes |
| **dev-logs/** | What shipped — **paired human MD + agent JSON** before each product push | Yes |
| **sessions/** | Per-session work summaries — what we worked on, decisions, follow-ups (archived from MEMORY.md) | Yes |
| **architecture-push-logs/** | Platform/npm sync — paired logs before pushing [create-modular-monolith](https://github.com/Pukujan/create-modular-monolith) | Yes |

## Filename convention

```text
{NNN}_{YYYY-MM-DD}_{HH-MM}_{kind}_{short-slug}.md   ← study-docs, handoffs, dev-logs
{NNN}_{YYYY-MM-DD}_{HH-MM}_{short-slug}/            ← planning phase folders
```

| Folder | `kind` / structure | Example |
|--------|---------------------|---------|
| handoffs/ | `handoff`, `handoff-v2`, … | `005_2026-05-23_10-49_handoff-original_…` |
| study-docs/ | `study-log` | `009_2026-05-31_04-14_study-log_maria-santos-demo-seed` |
| planning/ | phase folder | `009_2026-05-31_04-14_maria-santos-demo-seed/plan-log.md` |
| dev-logs/ | `dev-log` (fixed) | `001_2026-05-24_14-30_dev-log_work-log-reorg` |

Details: [handoffs/README.md](./handoffs/README.md) · [study-docs/README.md](./study-docs/README.md) · [planning/README.md](./planning/README.md) · [dev-logs/README.md](./dev-logs/README.md) · [architecture-push-logs/README.md](./architecture-push-logs/README.md)

## 005 program order

1. Original spec → [handoffs/005_…_handoff-original_…](./handoffs/005_2026-05-23_10-49_handoff-original_parsed-cache-rule-authority.md)
2. v3 architecture → [handoffs/005_…_handoff-v3_…](./handoffs/005_2026-05-23_11-20_handoff-v3_filing-structure-architecture.md)
3. v2 pipeline → [handoffs/005_…_handoff-v2_…](./handoffs/005_2026-05-23_11-14_handoff-v2_planned-review-in-cursor.md)
