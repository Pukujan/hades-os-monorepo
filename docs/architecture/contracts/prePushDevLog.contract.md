# Contract: pre-push dev log

**Version:** `v001`  
**Code:** `backend/src/shared/contracts/prePushDevLog.contract.js`  
**Agent schema:** `work-log/dev-logs/schemas/dev-log-agent.v1.schema.json` (`1.0.0`)

## Purpose

Before each git push, produce a **paired audit**:

| Audience | Path | Format |
|----------|------|--------|
| Human | `work-log/dev-logs/human/` | Markdown — Part I summary + Part II detail |
| Agent | `work-log/dev-logs/agent/` | JSON — machine-readable audit |

## Commands

```bash
npm run dev-log:pre-push -- --slug <kebab-topic> [--program 005] [--no-tests]
npm run dev-log:verify
npm run dev-log:sync-head -- --latest   # after commit — align agent git.sha with HEAD
npm run dev-log:pre-push -- --check     # requires git + agent log for HEAD
npm run dev-log:install-hook            # optional strict pre-push hook
```

## Human log structure (Part I + Part II)

**Part I — Summary** (auto-filled):

- Table of contents with anchor links
- Mermaid: HTTP modules, pipeline versions, pre-push flow
- Audit tables: API surface, version/prompt contracts, tests, git, repo shape
- Condensed repository tree (link to full tree in Part II)

**Part II — Detailed** (fill):

- Goals, decisions, changes, iterations, outcomes, follow-ups
- Full HTTP registry from `docs/API.md`
- Full git porcelain + diff stat
- Full repository tree

Generator: `scripts/lib/dev-log-human-format.mjs`

## Agent log (required fields)

- `meta`, `summary`, `apis`, `git`, `tests`, `repositoryTree`
- `changes`, `decisions[]`, `iterations[]`
- `tradeoffs`, `improvements`, `regressions`, `risks`, `followUps`

`apis` is built by `scripts/lib/api-inventory.mjs` from `docs/API.md` + `pipelineVersions.js` + `promptVersions.js`.

## Repository tree rules

Equivalent to:

```bash
tree -I "node_modules|.git|dist|build"
```

Implemented in `scripts/lib/repo-tree.mjs`. `.DS_Store` files also excluded.

## Git

- Works **without** git (fields show `unknown` until `git init`)
- After git init: branch, SHA, porcelain, diff stat populate automatically

## Related

- [work-log/dev-logs/README.md](../../../work-log/dev-logs/README.md)
- [AGENTS.md](../../../AGENTS.md) — pre-push section
- `.agents/commands/pre-push-dev-log.md`
