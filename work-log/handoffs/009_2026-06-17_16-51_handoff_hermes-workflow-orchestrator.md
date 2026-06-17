# Handoff: Hermes Workflow Orchestrator

**Date:** 2026-06-17 16:51
**Study:** `work-log/study-docs/004_2026-06-17_16-51_study-log_hermes-workflow-orchestrator.md`
**Plan:** `work-log/planning/010_2026-06-17_16-51_hermes-workflow-orchestrator/plan-log.md`
**Contracts:** `work-log/planning/010_2026-06-17_16-51_hermes-workflow-orchestrator/build-phase-contracts.md`
**Depends on:** `work-log/planning/009_2026-06-17_16-37_hermes-memory-isolation-tdd/plan-log.md`

## Objective

Evolve Hermes from a single minion execution runtime into an orchestrator for complex, reusable workflows. Treat "minion" as the user-facing name for a saved goal/workflow.

Primary red/green script:

```bash
npm run test:hades-workflow-orchestrator
npm run test:hades-workflow-build-phases
```

Package-level scripts:

```bash
npm --prefix backend run test:hades-workflow-orchestrator
npm --prefix frontend run test:hades-workflow-ui
npm --prefix backend run test:hades-workflow-build-phases
npm --prefix frontend run test:hades-workflow-build-phases-ui
node --test scripts/hades-extension-package.tdd.test.mjs
```

## First Product Target

Build a targeted job-application workflow:

- save multiple resumes/profile contexts
- read job requirements from text, URL, extension page capture, or Firecrawl
- match requirements to profile facts and ATS keywords
- generate tailored resume and cover letter artifacts
- fill browser forms through extension-mediated actions
- require approval before submit
- save audit history, generated files, and workflow improvements
- generate a compact explanation package for the saved workflow: short description, markdown table, mobile-friendly Mermaid chart, guardrails, and creation/update notes

## Build Order

1. Complete scoped durable memory and document/profile storage.
2. Add workflow definitions and workflow runs.
3. Add tool registry and fake-tool orchestration tests.
4. Add internal memory/document tools.
5. Add job application planner and artifact generation.
6. Add browser extension page/form context contract.
7. Add extension action execution with approval gates.
8. Add MCP/API adapters such as Firecrawl through the same tool registry.
9. Replace frontend mock previews with backend-provided workflow explanations and run logs.
10. Add frontend markdown and Mermaid rendering support for workflow explanation views.
11. Add a separate extension package in this repo with chat, workflow list/detail, upload, text context spaces, page capture, and approval UI.
12. Add rotatable extension API keys generated from the main Hades UI.

## Non-Negotiables

- Hades backend owns auth, persistence, tool permissions, approval, and audit.
- Hermes can plan and decide, but Hades validates and executes tools.
- User data stays scoped by `userId` and `tenantId`.
- High-impact actions require approval: submit application, send email, post publicly, purchase, delete, calendar write.
- Extension should be thin: capture page context, show Hades chat, apply approved actions.
- Extension API keys must be named, scoped, rotatable, revocable, and redacted from logs.
- Extension uploads and main UI uploads must use the same backend document/context store.

## Tests To Start With

- Workflow definitions cannot reference tools not granted to the user/workflow.
- Orchestrator pauses when a tool requires approval.
- User A cannot access User B profile context, generated artifacts, workflow runs, or tool call logs.
- Job workflow can extract requirements from a fake job page and produce a tailored resume draft from fake profile context.
- Browser extension contract returns proposed actions without executing submit.
- Workflow explanation includes a short description, markdown table, top-down Mermaid flowchart, and guardrail summary.
- Frontend workflow detail renders markdown and Mermaid from backend explanation data, with safe fallbacks for malformed content.
- Extension key contract proves keys can be generated, rotated, revoked, scoped, and never exposed after creation.
- Extension UI contract proves chat, workflow list, upload, text context spaces, page capture, and approval prompts use backend data.

## Initial Red Tests

- Backend workflow contract covers `workflowDefinition.contract.js`, `workflowRepository.js`, `workflowOrchestrator.js`, and the extension key repository contract.
- Frontend workflow UI contract covers `utils/workflowExplanation.js` and the extension workflow console contract.
- These tests define the backend-owned JSON requirements, approval behavior, scoped workflow state, dynamic frontend explanation rendering, extension API key lifecycle, and extension UI data shape.

Current orchestrator result:

- `npm run test:hades-workflow-orchestrator` runs both backend and frontend package tests.
- Backend passes 4 workflow tests, including the extension API key repository contract.
- Frontend passes 4 workflow explanation tests, including the extension console state contract.

Additional build phase red contracts:

- Detailed handoff contracts live in `work-log/planning/010_2026-06-17_16-51_hermes-workflow-orchestrator/build-phase-contracts.md`.
- `npm run test:hades-workflow-build-phases` runs backend phase contracts, frontend phase contracts, and the repo-level extension package contract.
- Backend phase contracts expect `memoryDocumentTools.js`, `toolRegistry.js`, `jobApplicationPlanner.js`, `browserExtensionContract.js`, `externalAdapterRegistry.js`, and `workflowAuditRepository.js`.
- Frontend phase contracts expect `workflowDetailViewModel.js`, `workflowExplanationRenderer.js`, `workflowContextLibrary.js`, and `workflowCrudContracts.js`.
- Extension package contract expects `extension/package.json`, `extension/public/manifest.json`, extension UI surfaces for chat/workflows/uploads/text spaces/page capture/approvals, and `extension/src/api/hadesExtensionClient.js`.

Build phase result:

- Backend build phase suite: 5 pass, 0 fail.
- Frontend build phase suite: 4 pass, 0 fail.
- Extension package suite: 3 pass, 0 fail.
- These contracts prove expected modules, helpers, and extension package shape exist.

## Remaining Runtime Wiring

The current green tests are contract/unit/package-shape tests. They do not yet prove the feature is wired into the running product.

Next work should add integration and app-wiring tests before implementation:

- Extension install/design handoff: `work-log/handoffs/010_2026-06-17_handoff_hades-extension-install-and-design.md`.
- Durable workflow run state and recovery handoff: `work-log/handoffs/012_2026-06-17_handoff_durable-workflow-run-state-recovery.md`.
- Mount extension key routes and prove create/list/rotate/revoke/auth behavior through Hades HTTP routes.
- Wire workflow definitions, runs, audit repository, tool registry, and approval queues into Hades service/routes.
- Wire memory/document tools into the orchestrator run loop using authenticated context.
- Wire frontend workflow list/detail/create/edit screens to backend APIs instead of utility-only view models.
- Render sanitized Markdown and Mermaid in actual React components.
- Wire extension client surfaces to real backend endpoints with the generated extension API key.
- Add an end-to-end fake job application flow that captures page context, drafts artifacts, proposes fill actions, and pauses before submit.

## Notes

Do not make Firecrawl, MCP, or Playwright the core abstraction. They are adapters behind the Hades tool registry. The core abstraction is a scoped workflow run with audited tool calls and approval gates.

Frontend should become a dynamic workflow console. It should log runs, render explanations, expose prompt/guardrail edits, and delete/archive unwanted workflows. It should not own hardcoded minion previews as product truth.
