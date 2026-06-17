# Hermes Workflow Build Phase Contracts

**Plan ID:** `010_2026-06-17_16-51_hermes-workflow-orchestrator`
**Handoff:** `work-log/handoffs/009_2026-06-17_16-51_handoff_hermes-workflow-orchestrator.md`
**Primary gate:** `npm run test:hades-workflow-build-phases`

## Contract Rules

- Turn contracts green one phase at a time.
- Do not delete or weaken red tests to make progress look complete.
- Keep Hades backend as the authority for auth, persistence, tool permission, approvals, and audit logs.
- Keep Hermes as planner/orchestrator, not a persistence or permission bypass.
- Keep extension thin: it captures browser context, renders Hades UI, stores only its scoped extension key, and applies approved actions.
- Keep all user data scoped by `userId` and `tenantId`.
- Treat submit/send/post/purchase/delete/calendar-write as high-impact actions that require approval.

## Phase 4 Contract: Internal Memory And Document Tools

Test file: `backend/src/modules/hades/tests/unit/hades.workflow-build-phases.tdd.test.js`

Expected modules:

- `backend/src/modules/hades/workflows/memoryDocumentTools.js`
- `backend/src/modules/hades/workflows/toolRegistry.js`

Acceptance:

- `createMemoryDocumentTools()` returns workflow tools for profile memory search, document text retrieval, and artifact saving.
- `createToolRegistry()` registers tools and resolves them by name.
- Tool execution must override untrusted caller-supplied `userId` and `tenantId` with the authenticated context.
- Internal read tools do not require approval by default.
- Tool definitions expose stable names that workflow definitions can grant.

## Phase 5 Contract: Job Application Planner

Test file: `backend/src/modules/hades/tests/unit/hades.workflow-build-phases.tdd.test.js`

Expected module:

- `backend/src/modules/hades/workflows/jobApplicationPlanner.js`

Acceptance:

- `createJobApplicationPlanner().plan()` accepts job context, profile context, and approval policy.
- It extracts job requirements and ATS keywords from job text.
- It maps resume/profile facts to the requirements.
- It drafts tailored resume Markdown and cover letter Markdown.
- It proposes safe draft/fill actions only.
- It must not include submit actions in the first plan.
- It must mark submit as approval-required.

## Phase 6 Contract: Browser Extension Page/Form Capture

Test file: `backend/src/modules/hades/tests/unit/hades.workflow-build-phases.tdd.test.js`

Expected module:

- `backend/src/modules/hades/workflows/browserExtensionContract.js`

Acceptance:

- `createBrowserExtensionContract().normalizePageCapture()` accepts URL, title, visible text, forms, fields, and submit selectors.
- It preserves useful form metadata.
- It redacts existing field values.
- It marks fields with provided values as sensitive instead of storing the raw value.
- It produces stable data Hermes can reason over without direct DOM access.

## Phase 7 Contract: Approval-Safe Browser Actions

Test file: `backend/src/modules/hades/tests/unit/hades.workflow-build-phases.tdd.test.js`

Expected module:

- `backend/src/modules/hades/workflows/browserExtensionContract.js`

Acceptance:

- `proposeFormActions()` returns structured actions such as `fill_field` and `attach_file`.
- It can map generated artifacts to browser form fields.
- It never returns `submit_form` as an automatic action.
- It returns `requiresApprovalForSubmit: true`.

## Phase 8 Contract: External Tool Adapters

Test file: `backend/src/modules/hades/tests/unit/hades.workflow-build-phases.tdd.test.js`

Expected module:

- `backend/src/modules/hades/workflows/externalAdapterRegistry.js`

Acceptance:

- Firecrawl, MCP clients, and Playwright/browser bridges are adapters behind Hades tool definitions.
- Adapter tool names are explicit, for example `external.firecrawl.scrape`, `external.mcp.supabase.callTool`, and `browser.playwright.proposeActions`.
- All adapter tools are audited.
- Browser action tools require approval where they can mutate a page or submit data.
- External adapters must not bypass workflow tool grants.

## Phase 9 Contract: Workflow Audit Repository

Test file: `backend/src/modules/hades/tests/unit/hades.workflow-build-phases.tdd.test.js`

Expected module:

- `backend/src/modules/hades/workflows/workflowAuditRepository.js`

Acceptance:

- Records workflow tool calls, approvals, artifacts, and run history.
- Lists records only for matching `userId` and `tenantId`.
- Never leaks User A records to User B.
- Stores enough information to reconstruct what Hermes planned, what Hades executed, and what the user approved or rejected.

## Phase 10 Contract: Markdown And Mermaid Workflow Detail

Test file: `frontend/src/modules/hades/tests/unit/workflowBuildPhases.tdd.test.js`

Expected modules:

- `frontend/src/modules/hades/utils/workflowDetailViewModel.js`
- `frontend/src/modules/hades/utils/workflowExplanationRenderer.js`

Acceptance:

- Workflow detail view models are built from backend workflow explanation data.
- Frontend does not use hardcoded minion previews as product truth.
- Wide Mermaid diagrams such as `LR`/`RL` are converted to mobile-first `TD`.
- Approval-required runs show an approval banner.
- Markdown and Mermaid content is sanitized before display.
- Unsafe scripts, `javascript:` links, and Mermaid click handlers are stripped.

## Phase 11 Contract: Shared Context Library And Extension Package

Test files:

- `frontend/src/modules/hades/tests/unit/workflowBuildPhases.tdd.test.js`
- `scripts/hades-extension-package.tdd.test.mjs`

Expected modules/files:

- `frontend/src/modules/hades/utils/workflowContextLibrary.js`
- `frontend/src/modules/hades/utils/workflowCrudContracts.js`
- `extension/package.json`
- `extension/public/manifest.json`
- `extension/src/surfaces/HadesExtensionApp.jsx`
- `extension/src/surfaces/HadesChatPanel.jsx`
- `extension/src/surfaces/WorkflowListPanel.jsx`
- `extension/src/surfaces/ContextUploadPanel.jsx`
- `extension/src/surfaces/TextContextSpacesPanel.jsx`
- `extension/src/surfaces/PageCapturePanel.jsx`
- `extension/src/surfaces/ApprovalQueuePanel.jsx`

Acceptance:

- Main UI and extension share the same backend document/context APIs.
- Context library can merge resumes, PDFs, text spaces, selected context IDs, and current page context.
- Workflow CRUD payloads are backend-driven and include selected context, prompt, guardrails, and allowed tools.
- The extension exists as a separate package in this repo.
- Extension manifest is Manifest V3.
- Extension requests storage and activeTab permissions.
- Extension surfaces exist for chat, workflow list/detail, uploads, text context spaces, page capture, and approvals.

## Phase 12 Contract: Extension API Keys

Test files:

- `backend/src/modules/hades/tests/unit/hades.workflow-orchestrator.tdd.test.js`
- `frontend/src/modules/hades/tests/unit/workflowExplanation.tdd.test.js`
- `frontend/src/modules/hades/tests/unit/workflowBuildPhases.tdd.test.js`
- `scripts/hades-extension-package.tdd.test.mjs`

Expected modules/files:

- `backend/src/modules/hades/workflows/extensionKeyRepository.js`
- `frontend/src/modules/hades/utils/extensionWorkflowConsole.js`
- `frontend/src/modules/hades/utils/workflowCrudContracts.js`
- `extension/src/api/hadesExtensionClient.js`

Acceptance:

- Extension API keys are named, scoped, rotatable, revocable, and secret-safe.
- Raw key secret is shown only at creation time.
- Stored/listed keys expose redacted previews only.
- Revoked keys cannot authenticate.
- Rotated keys invalidate old secrets.
- Extension settings UI can show key scopes and rotate/revoke actions without exposing the secret.
- Extension client stores only the user-generated extension key locally.
- Extension client calls scoped `/api/hades/extension/...` endpoints with `Authorization: Bearer`.
- Extension code must not contain service-role keys or provider API secrets.

## Required Commands

Run these while implementing:

```bash
npm run test:hades-workflow-orchestrator
npm run test:hades-workflow-build-phases
```

Run focused commands when working phase-by-phase:

```bash
npm --prefix backend run test:hades-workflow-build-phases
npm --prefix frontend run test:hades-workflow-build-phases-ui
node --test scripts/hades-extension-package.tdd.test.mjs
```

## Done Definition

- `npm run test:hades-memory-isolation` passes.
- `npm run test:hades-workflow-orchestrator` passes.
- `npm run test:hades-workflow-build-phases` passes.
- Existing unrelated tests are not weakened or deleted.
- Handoff #009 is updated with final green results and any intentionally deferred scope.
