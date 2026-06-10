# Evals, regression, and CI gates

Plain-language guide to how this repo checks prompt and pipeline quality automatically.

---

## What is a “gate”?

A **gate** is an automatic check that must pass before code is merged or published.

Think of it like airport security: if the check fails, you do not proceed until it is fixed.

| Gate (command) | What it blocks |
|----------------|----------------|
| `npm run lint:contracts` | Broken contract paths in `manifest.json` |
| `npm run lint:repo-artifacts` | Missing required folders/files (including golden CI slice) |
| `npm run lint:architecture` | Module boundary/layer/API doc violations |
| `npm test` | Unit/integration test failures |
| `npm run test:evals` | Golden regression failures (offline, no API key) |

GitHub Actions runs these on every push/PR to `main` (see `.github/workflows/ci.yml`).

---

## What is “eval / regression”?

**Eval** = compare actual AI output to **expected** (golden) JSON.

**Regression** = re-run that comparison after you change prompts or code, to see if quality got worse.

```text
Fixture output (or live batch output)
        ↓
   evalRunner.evalDocument()
        ↓
Compare to evals/golden/case_001/doc_NNN.expected.json
        ↓
Scores + pass | partial | fail
```

This repo uses **golden files** under `evals/golden/case_001/`:

| File | Purpose |
|------|---------|
| `doc_001.expected.json` | What doc 1 extraction should look like |
| `after_doc_001.expected.json` | Case snapshot after doc 1 |
| `negative_guardrails.expected.json` | Rules that must never appear in output |
| `case_001.golden-dataset.json` | Manifest (checkpoints, version) |

A **minimal golden slice** is committed for CI. Full synthetic case data can be ingested via:

```bash
npm run import:file-exchange -- <bundle>
npm run ingest:golden-expected
```

---

## Running evals locally

```bash
# All module eval runners (offline for case-filing-ai)
npm run test:evals

# Case Filing AI only
npm run test:evals -- case-filing-ai
```

`golden-regression.eval.mjs` uses test fixtures — **no OpenRouter key required**.

Live batch evals still run when you process uploads; reports land in `data/.../batches/batch-NNN/evals/`.

---

## Trace IDs (observability)

Each batch gets `batchTraceId`; each document gets `traceId` in:

- `processing-log.jsonl` entries
- Document output JSON

Use these to correlate logs, eval reports, and future external tracing (Langfuse, etc.).

---

## Schema validation

Master prompt JSON is validated against:

- `schemas/master-output.v1.schema.json` (v1, compact, v2)
- `schemas/master-output.v001.schema.json` (v001)

Invalid output triggers a schema-aware retry before failing the document.

---

## CI workflow

`.github/workflows/ci.yml` runs on push/PR:

1. Install backend + frontend deps  
2. `lint:contracts` · `lint:repo-artifacts` · `lint:architecture`  
3. `npm test`  
4. `npm run test:evals`  

Or locally: `npm run test:ci` (same checks from repo root).
