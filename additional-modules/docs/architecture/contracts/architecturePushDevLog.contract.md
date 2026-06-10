# Contract: architecture push dev log

**Version:** `v001`  
**Code:** `backend/src/shared/contracts/architecturePushDevLog.contract.js`  
**Agent schema:** `work-log/architecture-push-logs/schemas/arch-push-agent.v1.schema.json` (`1.0.0`)

> **Starter package scope:** This spec is **not** registered in [manifest.json](./manifest.json) for the npm boilerplate. The template ships the contract markdown/JS for export sync only; `arch-log:push` / `arch-log:verify` scripts live in the **maintainer** repo ([create-modular-monolith](https://github.com/Pukujan/create-modular-monolith) root), not in generated apps.

## Purpose

When syncing **legal-prmpt-eng** → **[create-modular-monolith](https://github.com/Pukujan/create-modular-monolith)** (architecture export + npm publish), record a **separate** paired audit from product pre-push dev logs.

| Audience | Path | Format |
|----------|------|--------|
| Human | `work-log/architecture-push-logs/human/` | Markdown — export/npm summary + fill sections |
| Agent | `work-log/architecture-push-logs/agent/` | JSON — machine-readable export handoff |

Human logs include a **long-form UTC timestamp** in the header (e.g. `Sunday, 24 May 2026, 14:53 UTC`) plus sortable filename stamps (`YYYY-MM-DD`, `HH-MM`).

## Commands

```bash
npm run arch-log:push -- --slug <kebab-topic> [--npm-version 2.2.5] [--export-to /path/to/create-modular-monolith/template]
npm run arch-log:verify
```

Run **after** `npm run export:architecture-starter -- --to …` and **before** pushing create-modular-monolith / `npm publish`.

## Product vs architecture logs

| Log | When | Focus |
|-----|------|--------|
| `dev-log:pre-push` | Every product repo push | APIs, tests, full tree, domain changes |
| `arch-log:push` | Architecture/npm export only | Starter templates, export script, contracts manifest, npm version |

## Agent log (required fields)

- `meta`, `summary`, `architecturePush`, `git`, `exportLint`, `starterChanges`, `changes`, `decisions[]`, `followUps`

## Related

- [prePushDevLog.contract.md](./prePushDevLog.contract.md) — product pushes
- [work-log/architecture-push-logs/README.md](../../../work-log/architecture-push-logs/README.md)
- `.agents/commands/architecture-push-log.md`
