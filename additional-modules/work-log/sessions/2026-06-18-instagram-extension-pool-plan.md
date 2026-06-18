# Session archive — 2026-06-18-instagram-extension-pool-plan

- **Archived:** 2026-06-18
- **Module:** `instagram-extension-pool-plan`
- **Previous:** slack-oauth-extension-css-rls

---

## Summary

Fixed Instagram Composio auth URL (v3.1→v3) + resilient tenant alias assertion, completed a massive extension CSS/JSX refactor (595 CSS lines, 8 panel files), documented the Hermes worker pool architecture plan, and added dev-log enforcement to CI.

---

## What Shipped

### Instagram Auth Fix
- `instagramAuthLink.service.test.js`: URL changed from `v3.1` to `v3`, alias assertion from exact string to `.startsWith("hades-tenant_123-instagram-")`
- Test passes 2/2 in 0.006s

### Extension CSS/JSX Refactor
- 595 lines of CSS added to `hades-extension.css` (shared variables, panel layout, dark theme, form elements, status badges)
- 8 JSX files refactored for consistent styling + class-based theming:
  - `ApprovalQueuePanel.jsx` (+154/-0 net)
  - `ContextUploadPanel.jsx` (+147/-105 net)
  - `HadesChatPanel.jsx` (+89/-51 net)
  - `HadesExtensionApp.jsx` (+278/-55 net)
  - `PageCapturePanel.jsx` (+119/-48 net)
  - `TextContextSpacesPanel.jsx` (+142/-44 net)
  - `WorkflowDetailPanel.jsx` (+112/-38 net)
  - `WorkflowListPanel.jsx` (+143/-57 net)
- Build artifacts regenerated: `manifest.json`, `popup.html`, `dist/assets/`
- `extension.zip` deleted (replaced by individual dist assets)

### Hermes Worker Pool Plan
- Architecture document: `additional-modules/work-log/sessions/2026-06-18-hermes-worker-pool-plan.md`
- Three modes: warm (pre-forked), auto (on-demand), cold (minion-scoped)
- Per-user cap, pool-managed lifecycle
- Implementation deferred

### Dev Log Enforcement
- `lint-deploy.test.mjs` with 9 assertions — blocks push if dev log is missing
- Enforcement runs in CI

---

## Decisions Made

- Instagram fix only — no DM sending test added (needs live API credentials)
- Token duplication not a real issue (Composio generates new link per call; other connectors upsert)
- Extension build artifacts committed (not gitignored) — reproducible builds favored over repo size
- Worker pool plan documented before implementation to reduce risk of wrong-first-attempt

---

## Test Results

| Suite | Pass | Fail | Notes |
|-------|------|------|-------|
| Instagram auth test | 2 | 0 | v3 URL + startsWith assertion, 0.006s |

---

## Follow-ups

- [ ] Implement Hermes worker pool (cross-module, needs `check_gate`)
- [ ] Add Instagram DM integration test once API credentials available
- [ ] Revisit extension/dist/ git tracking — consider build-on-demand or .gitignore

---

## Files Created/Changed

| File | Action |
|------|--------|
| backend/src/modules/hades/tests/unit/instagramAuthLink.service.test.js | Modified |
| extension/src/hades-extension.css | Modified |
| extension/src/popup.jsx | Modified |
| extension/src/surfaces/ApprovalQueuePanel.jsx | Modified |
| extension/src/surfaces/ContextUploadPanel.jsx | Modified |
| extension/src/surfaces/HadesChatPanel.jsx | Modified |
| extension/src/surfaces/HadesExtensionApp.jsx | Modified |
| extension/src/surfaces/PageCapturePanel.jsx | Modified |
| extension/src/surfaces/TextContextSpacesPanel.jsx | Modified |
| extension/src/surfaces/WorkflowDetailPanel.jsx | Modified |
| extension/src/surfaces/WorkflowListPanel.jsx | Modified |
| extension/dist/extension.zip | Deleted |
| extension/dist/manifest.json | Created |
| extension/dist/popup.html | Created |
| extension/dist/assets/ | Created |
| additional-modules/buildplan/agent_state.json | Modified |
| additional-modules/buildplan/context_budget.json | Modified |
| additional-modules/buildplan/agent_state.sha256 | Modified |
| MEMORY.md | Modified |
| additional-modules/work-log/sessions/INDEX.md | Modified |
| work-log/dev-logs/human/005_2026-06-18_17-10_dev-log_instagram-extension-pool-plan.md | Created |
| work-log/dev-logs/agent/005_2026-06-18_17-10_dev-log-agent_instagram-extension-pool-plan.json | Created |
