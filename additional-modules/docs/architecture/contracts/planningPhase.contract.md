# planningPhase contract

**Version:** v003  
**Code:** `backend/src/shared/contracts/planningPhase.contract.js`

## Purpose

Audit trail **before** implementation. Each planned phase lives in its own dated folder under `work-log/planning/`.

| Artifact | Location | Filename |
|----------|----------|----------|
| Phase folder | `work-log/planning/` | `{NNN}_{YYYY-MM-DD}_{HH-MM}_{slug}/` |
| Plan log | inside phase folder | `plan-log.md` — actionable build spec |
| Audit log | inside phase folder | `audit-log.md` — spec traceability / gap audit |
| Design (optional) | inside phase folder | `design-log.md` or `*_design_{slug}*.md` |
| Manifest | inside phase folder | `manifest.json` via `npm run plan:finalize` |

**Study logs** (`work-log/study-docs/*_study-log_{slug}.md`) are **user-owned personal notes**. Agents must **not** read, write, or gate on them. They remain in the repo for the user's reference only.

## Agent workflow

1. **Plan log** — goal, constraints, file paths, verification checklist ([planning-plan-package](../../agents/commands/planning-plan-package.md))
2. **Audit log** — scope audited, gap table, pass/fail notes
3. **Design** (optional) — architecture notes in the same phase folder
4. **Finalize** — `npm run plan:finalize -- --slug <slug>` writes `manifest.json` inside the phase folder
5. **Gate** — `npm run plan:gate -- --slug <slug>` before tier-L implementation

## Gate

```bash
npm run plan:gate -- --slug <plan-slug> [--plan-id <id>]
```

Requires approved `manifest.json` with `artifacts.planLogMd` and `artifacts.auditLogMd`.

## API

`GET /api/platform/planning/:planId/download?format=md`

## Version history

| Version | Change |
|---------|--------|
| v003 | Phase folders with `plan-log.md` + `audit-log.md` + in-folder `manifest.json`; study logs user-only (not agent workflow) |
| v002 | Plan packages moved from `study-docs/` to `planning/` flat files |
| v001 | Study log + plan package + root manifest |
