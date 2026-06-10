# Contract: file exchange

**Version:** `v001`  
**Timestamp helper:** `backend/src/shared/utils/formatExchangeTimestamp.js`  
**User doc:** [file-exchange/README.md](../../../file-exchange/README.md)

## Layout

Paths resolve via `resolveArtifactPaths(repoRoot)` (`local-artifacts.json` optional). In-repo defaults:

```text
file-exchange/
  imports/{stamp}/     ← inbound bundles (mandatory before processing)
  exports/{stamp}/     ← session deliverables (batch runs, curl logs)
  exports/consolidated-*.json   ← see consolidatedExports contract
```

When `artifactRoot` is set in `local-artifacts.json`, the entire `file-exchange/` tree may live under `{artifactRoot}/file-exchange/`.

## Stamp format (human-readable UTC)

```text
YYYY-MM-DD_HH-MM-SSZ
```

Example: `2026-05-23_15-59-43Z`

Legacy compact stamps (`20260523T155943Z`) are normalized by `normalizeExchangeStamp()` in the timestamp helper.

## Mandatory workflow (agents)

1. `npm run import:file-exchange -- "<path>"` — copies bundle into `imports/{stamp}/`
2. **Remove from repo root** — if the bundle was under the repository root (not already under `imports/`), the import script deletes the source after a successful copy. Do not leave inbound folders at repo root.
3. Process only from `imports/{stamp}/`
4. Copy deliverables to `exports/{stamp}/`
5. `npm run condense:all` when refreshing consolidated snapshots

External paths (e.g. `~/Downloads/`) are copied only; delete those manually if desired.

Enforced by `AGENTS.md` and `.agents/rules/file-exchange-inbox.mdc` (`alwaysApply: true`).

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/import-to-file-exchange.mjs` | Copy bundle → `imports/{stamp}/` |
| `scripts/clear-file-exchange.mjs` | Remove dated import/export session folders |
| `scripts/resolve-import-stamp.mjs` | Resolve human or legacy stamp folder |
| `scripts/ingest-golden-parsed.mjs` | Parsed cache → `evals/golden/` |
| `scripts/ingest-golden-expected.mjs` | Ground truth → `doc_NNN.expected.json` |

## HTTP maintenance

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/file-exchange/clear` | Same as `clear-file-exchange` CLI (`confirm` or `dryRun` required) |

Preserves by default: `.gitkeep`, `exports/templates/`, latest `exports/consolidated-*.json`. See [docs/file-exchange/API.md](../../file-exchange/API.md).

## Related contracts

- [consolidatedExports.contract.md](./consolidatedExports.contract.md)
- [prePushDevLog.contract.md](./prePushDevLog.contract.md)
