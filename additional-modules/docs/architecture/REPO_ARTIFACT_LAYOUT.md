# Repository artifact layout

Canonical paths for runtime data, golden fixtures, and human↔agent exchange.

## External artifact root (optional)

Copy [`local-artifacts.example.json`](../../local-artifacts.example.json) → `local-artifacts.json` (gitignored) and set `artifactRoot` to a folder **outside** the repo for heavy runtime data.

**Resolver:** `backend/src/shared/config/resolveArtifactPaths.js`  
**Precedence:** per-path `ENV` > `local-artifacts.json` > in-repo defaults below.

| Layout key | Default under `artifactRoot` | Env override |
|------------|------------------------------|--------------|
| `batches` | `{root}/batches` | `CASE_FILING_BATCH_DIR` |
| `fileExchange` | `{root}/file-exchange` | `FILE_EXCHANGE_ROOT` |
| `evalBundles` | `{root}/eval-bundles` | `EVAL_BUNDLE_ROOT_DIR` |
| `caseExports` | `{root}/case-exports` | `CASE_EXPORT_ROOT_DIR` |
| `docExports` | `{root}/doc-exports` | — |
| `uploads` | `{root}/uploads` | `UPLOADS_ROOT` |

**Stays in-repo:** `evals/golden/`, `data/court-rules/fixtures/`, `work-log/dev-logs/`, authored `docs/`, application code.

**Runtime uploads (not file-exchange):** see [documentPersistence.contract.md](./contracts/documentPersistence.contract.md). Default in-repo root: `data/uploads/{documentId}/`.

In-repo `file-exchange/imports/` and `exports/` may remain as `.gitkeep` stubs when using an external root; agents should print **resolved absolute paths** from the import script output.

## Roots (in-repo defaults)

| Root | Env override | Writable at runtime |
|------|----------------|---------------------|
| `data/batches/` | `CASE_FILING_BATCH_DIR` | Yes (optional runtime batches) |
| `evals/golden/{caseId}/` | `GOLDEN_DATASET_DIR` | No (fixtures) |
| `data/court-rules/fixtures/` | — | No |
| `eval-bundles/` | `EVAL_BUNDLE_ROOT_DIR` | Yes (export API) |
| `case-exports/` | `CASE_EXPORT_ROOT_DIR` | Yes (export API) |
| `data/uploads/` | `UPLOADS_ROOT` | Yes (runtime upload blobs) |
| `file-exchange/imports\|exports/` | — | Yes (human triage) |
| `work-log/dev-logs/human\|agent/` | — | Yes (pre-push audit) |
| `consolidated-files/consolidated-*.json` | — | Yes (latest mirror for all condense outputs) |
| `work-log/` | — | Yes (docs only) |

## Batch folder (`batches/batch-NNN/`)

```text
uploads/
parsed-documents/doc-NNN/    # v2+ parsed cache
outputs/doc-NNN.json
evals/doc_NNN.eval-report.json
rule/
case-snapshot.json
processing-log.jsonl
```

## Golden (`evals/golden/case_001/`)

```text
case_001.golden-dataset.json
doc_NNN.expected.json
parsed/doc-NNN/              # optional parse golden (v2)
```

## File exchange

Imports: `file-exchange/imports/{2026-05-23_15-59-43Z}/`  
Session exports: `file-exchange/exports/{stamp}_{label}/`  
Consolidated snapshots: `file-exchange/exports/{stamp}_consolidated/` (+ latest `consolidated-*.json` at `exports/` root)

See [file-exchange/README.md](../../file-exchange/README.md) and [contracts/fileExchange.contract.md](./contracts/fileExchange.contract.md).

## Pre-push dev logs

```text
work-log/dev-logs/human/{NNN}_{date}_{time}_dev-log_{slug}.md
work-log/dev-logs/agent/{NNN}_{date}_{time}_dev-log-agent_{slug}.json
```

`npm run dev-log:pre-push` — see [contracts/prePushDevLog.contract.md](./contracts/prePushDevLog.contract.md).

## Consolidated exports

`npm run condense:all` → [contracts/consolidatedExports.contract.md](./contracts/consolidatedExports.contract.md).

## Contracts

**Overview (start here):** [CONTRACTS_OVERVIEW.md](./CONTRACTS_OVERVIEW.md)  
Manifest: [contracts/manifest.json](./contracts/manifest.json) · Changelog: [contracts/changelog.jsonl](./contracts/changelog.jsonl)

| Contract | Doc |
|----------|-----|
| File exchange | [fileExchange.contract.md](./contracts/fileExchange.contract.md) |
| Consolidated exports | [consolidatedExports.contract.md](./contracts/consolidatedExports.contract.md) |
| Pre-push dev log | [prePushDevLog.contract.md](./contracts/prePushDevLog.contract.md) |
| API registry | [apiDocumentationRegistry.contract.md](./contracts/apiDocumentationRegistry.contract.md) |
| Document persistence | [documentPersistence.contract.md](./contracts/documentPersistence.contract.md) |
| Case filing storage | `backend/src/modules/case-filing-ai/contracts/storageLayout.contract.js` |
| Parsed artifacts | `parsedDocumentArtifacts.contract.js` |
| Pipeline versions | `pipelineVersions.js` |
| Rule authority | `court-rules/contracts/ruleAuthority.contract.js` |

Human storage doc: [docs/case-filing-ai/STORAGE.md](../case-filing-ai/STORAGE.md)
