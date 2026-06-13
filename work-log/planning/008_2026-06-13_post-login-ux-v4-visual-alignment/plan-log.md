# Plan Log: Post-Login UX v4 Visual Alignment

## Metadata

- Date: 2026-06-13
- Phase: 008
- Module: control-platform / frontend post-login app
- Planning owner: Codex 5.5
- Implementation target: Codex 5.4 mini
- UX source of truth: `hades_os_post_login_ux_v4.html`
- Primary rule: preserve architecture, API contracts, auth, and login screen.

## Current State

The current app already has:

- React/Vite frontend under `frontend/src`.
- Post-login shell in `frontend/src/modules/hades/HadesApp.jsx`.
- Theme and social helper data in `frontend/src/modules/hades/hadesData.js`.
- Backend hydration adapter in `frontend/src/modules/hades/hadesApi.js`.
- App styling in `frontend/src/styles/hades.css`.
- Supabase-backed login gate and backend session forwarding.
- Discord bot bridge/runtime contract work already green.

The gap is visual/product UX:

- The accepted post-login prototype has a tighter mobile app shell.
- Minion lists and past summons need bounded internal scrolling.
- Minion cards need richer user-facing content.
- Minion Detail needs destination previews, command syntax, description, actions, and activity logs in a specific order.
- Notification dropdown needs a contained Manual/Auto log surface.
- The UI must avoid backend/runtime technical language.

## Non-Negotiable Guardrails

- Do not edit `frontend/src/auth/loginTemplate.html`.
- Do not edit `frontend/src/auth/LoginPage.jsx` unless explicitly requested later.
- Do not edit `frontend/src/auth/AuthProvider.jsx` for this phase.
- Do not change backend routes, response shapes, request shapes, services, or database contracts.
- Do not add backend fields just for visual labels.
- Do not expose user-facing terms like `MCP`, `runtime`, `schema`, `pipeline`, `tool invocation`, or `agent protocol`.
- Do not remove existing routes without a product decision.
- Do not break the existing Discord auth/bot bridge contract suite.

## Strategy

Use a frontend adapter layer to derive missing display-only fields from existing app state.

Example:

```js
const card = toMinionCardViewModel(minion, {
  assignments,
  socialLinks,
  activityLogs
});
```

This allows the frontend to show:

- `destinationLabel`
- `previewType`
- `previewMessages`
- `modeLabel`
- `statusLabel`
- `commandSyntax`
- `plainDescription`
- `followUpExamples`

without modifying backend contracts.

## Phase Gates

### Gate 0: Source Review

5.4 mini should read:

- `/Users/teresaguajardo/Downloads/june 2026/june 12/hades_os_post_login_ux_v4.html`
- `/Users/teresaguajardo/.codex/attachments/1edfab93-df14-4069-92e7-afdec84791bd/pasted-text.txt`
- `frontend/src/modules/hades/HadesApp.jsx`
- `frontend/src/modules/hades/hadesApi.js`
- `frontend/src/modules/hades/hadesData.js`
- `frontend/src/styles/hades.css`

Stop only if the prototype file is missing.

### Gate 1: Red Frontend View Model Tests

Add tests before implementation.

Prove:

- minions split into active/inactive display panes
- missing display fields are derived in frontend only
- destination previews resolve to Discord/Gmail/automation/Hades chat variants
- command syntax and plain description remain separate
- notification logs include exact source/location metadata
- tab and list data can render without changing backend state shape

Suggested files:

- `frontend/src/modules/hades/hadesViewModel.js`
- `frontend/src/modules/hades/hadesViewModel.test.js`

### Gate 2: Red Layout Guard Tests

Add source-level tests for scroll containment and route/login safety.

Prove:

- CSS contains bounded scroll classes for minion lists, past summons, notification logs, Hades chat, Forge chat, detail body, and activity log.
- bottom navigation remains shell-contained and fixed/stable.
- login template remains unmodified by this phase.

Suggested file:

- `frontend/src/modules/hades/hadesUxLayout.test.js`

### Gate 3: Green View Model + CSS Guardrails

Implement only enough frontend helper and CSS structure to pass Gates 1 and 2.

Keep this step narrow:

- no backend edits
- no auth edits
- no visual overhaul yet

### Gate 4: React Visual Integration

Refactor the post-login screens to match the accepted UX:

- app shell
- Minions screen
- Forge screen
- Socials screen
- Settings screen
- Minion Detail
- Notification dropdown

Use existing `HadesApp.jsx` first if that is safer. Extract small components only when clarity improves.

### Gate 5: Browser Acceptance

Use the in-app browser or available browser automation to check:

- 375px width
- 390px width
- 430px width

Required checks:

- bottom nav stays fixed
- active/inactive minion lists scroll internally
- minion slots do not get overlapped
- past summons scroll internally
- notification dropdown stays inside app bounds
- minion detail has required section order
- destination preview and command syntax are both visible
- login screen remains unchanged

### Gate 6: Regression Suite

Run:

```bash
npm --prefix frontend test
npm --prefix frontend run build
npm run test:discord-login-bot-contracts
npm run test:hades-runtime-contracts
```

If a backend test fails after frontend-only changes, investigate first. Do not patch backend casually.

## Auto-Continue Instruction For 5.4 Mini

5.4 mini should continue through all gates without asking the user to say "continue" after each gate.

Pause only if:

- login files must be modified to proceed
- backend/API/data contracts appear to require changes
- a new dependency install is required
- the prototype conflicts with an already-approved product decision
- secrets or credentials are needed

## Route Caution

The prototype uses Minions, Forge, Socials, and Settings as the primary bottom-nav set. The current app also has `/app/home`, `/app/inbox`, and `/app/me`-style surfaces.

For safety:

- keep existing routes working
- do not delete `/app/inbox`
- add notification dropdown behavior without removing the route
- if nav count changes are needed, preserve direct route access

