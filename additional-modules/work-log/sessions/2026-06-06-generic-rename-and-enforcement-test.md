# 2026-06-06 — Generic rename + enforcement test

## Summary
- Renamed all 12 legal-tech pipeline agent mini-modules to generic slugs (backend + frontend)
- Updated registry JSON, manifests, API docs, frontend mirror
- Verified enforcement: created deep import violation, lint:mini-modules caught it, then rolled back
- All lints pass after cleanup

## Rename mapping
| Legal slug → Generic slug |
|---|
| parser-agent → ingest-router |
| ocr-agent → document-processor |
| extractor-agent → data-extractor |
| filing-audit-agent → audit-agent |
| authority-planner-agent → planner-agent |
| rule-applicability-agent → applicability-agent |
| source-discovery-agent → source-discovery |
| source-crawler-agent → source-crawler |
| source-verifier-agent → source-verifier |
| rule-relevance-agent → relevance-agent |
| rule-filing-persist-agent → persist-agent |
| rule-discovery-run → run-orchestrator |

## Enforcement test results
- Created deep import: `import { processDocument } from "../document-processor/services/processor.service.js"` in ingest-router
- `npm run lint:mini-modules` → FAILED with correct error message pointing to barrel import
- Rolled back: removed violation file, all lints green
- Confirmed: sibling deep imports are properly caught and blocked

## Commit
`73ca5c8 feat(architecture): rename pipeline agents to generic slugs, add enforcement test`
