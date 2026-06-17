# OpenCode Handoff: Hades Conversational Minion Flow + Forge Edit Redirects

## Metadata

- `task`: `hades-conversational-minion-flow`
- `branch`: `master`
- `goal`: make Hermes chat create/edit minions naturally across general chat, Forge, Telegram, and the minion list/detail UI
- `scope`: remove strict Forge-only creation behavior, preserve clickable action buttons, preserve chat UX, keep deployability, and clean up old minion-flow assumptions
- `owner`: `OpenCode`
- `tdd`: `required`
- `status`: `ready`

## Why This Exists

The current minion flow is too rigid:

- Forge is treated like the only place minions can be created.
- General chat still behaves like a separate or secondary path.
- Edit actions are present in UI but do not complete a useful edit loop.
- Minion list/detail screens still carry old assumptions and weak compatibility behavior.
- Telegram and other chat routes still have strict command expectations that do not match the desired assistant flow.

This handoff should be used to make the minion flow more conversational and less form-like:

- users can ask Hermes to create a minion from general chat or Forge
- Forge becomes a helper and editor, not a hard gate
- editing should jump back into Forge with the existing minion loaded
- old minions and legacy UI compatibility should be removed where possible
- strong tests should define the new behavior first

## Product Decisions To Preserve

- Keep clickable buttons/actions in Hermes responses.
- Keep the chat feature available for future use.
- Keep hostability in Railway and Vercel.
- Keep docs, tests, work logs, and dev logs as first-class artifacts.
- Preserve deploy behavior unless a change is required for the new flow.
- Preserve versioning/metadata on minions so future updates are possible.

## Red Tests To Write First

### 1. Forge edit flow

Add tests that prove:

- clicking `Edit minion` in minion detail routes to Forge
- the selected minion id is passed into Forge
- Forge loads the existing minion draft instead of starting empty
- saving from that loaded draft updates the existing minion instead of always creating a new one

Suggested coverage:

- frontend component test for `MinionDetailScreen`
- frontend route/UI test for Forge screen loading edit context
- frontend state test for save/update behavior

### 2. General chat does not wipe Forge draft

Add tests that prove:

- a general chat response can update general chat state without erasing the active Forge draft
- forge draft state only changes when the Forge flow intends it

### 3. Minion list is usable for real inventories

Add tests that prove:

- minion list supports more than 16 entries
- pagination or overflow navigation works
- list items remain clickable
- edit/update affordance is available from the detail flow

### 4. Minion data normalization

Add tests that prove:

- saved minions normalize `commandName`, `targetSocial`, and `triggerType` from snake_case and camelCase
- old minion records can still render without breaking the UI
- future minions keep metadata/version fields available

### 5. Backend update/delete scoping

Add tests that prove:

- scoped minion update passes `tenantId` correctly
- scoped minion delete passes `tenantId` correctly
- the repo contract is used consistently by service code

### 6. Telegram command routing

Add tests that prove:

- Telegram does not force users into a strict Forge-only flow
- if a minion command matches, it can be executed directly
- if the user is in Forge mode, conversational input is treated as Forge assistance
- unknown bare text gets a helpful fallback, not a dead end

## Implementation Tasks

### Frontend

- Add an edit route or query-param-based Forge entry point.
- Load a minion into Forge draft state from the selected minion.
- Change `Edit minion` to navigate into Forge instead of being a dead button.
- Make save/update behavior distinguish between create and edit.
- Keep chat buttons/actions intact.
- Stop general chat from overwriting Forge draft state unless explicitly intended.
- Improve minion list rendering so inventories larger than one screen remain usable.
- Remove stale compatibility shims where the new flow is authoritative.

### Backend

- Fix `updateMinion` / `deleteMinion` scoped repository calls so they match the repo contract.
- Review chat routing so general chat, Forge, Telegram, and minion execution are consistent.
- Keep the response/action protocol compatible with clickable UI actions.

### Cleanup

- Replace weak tests with stronger behavior-focused tests when the new tests cover the same surface better.
- Remove or reduce old UI compatibility paths that preserve broken behavior.
- Keep docs and work logs in sync with the new flow.

## Files Likely In Scope

- `frontend/src/modules/hades/pages/HadesPrototypeApp.jsx`
- `frontend/src/modules/hades/pages/MinionDetailScreen.jsx`
- `frontend/src/modules/hades/pages/MinionListScreen.jsx`
- `frontend/src/modules/hades/services/hadesApi.js`
- `frontend/src/modules/hades/utils/hadesData.js`
- `frontend/src/modules/hades/utils/parser.js`
- `backend/src/modules/hades/services/hades.service.js`
- `backend/src/modules/hades/services/telegramBotRuntime.service.js`
- `backend/src/modules/hades/repositories/minionRepository.js`
- `backend/src/modules/hades/validators.js`
- `frontend/src/modules/hades/tests/unit/*`
- `backend/src/modules/hades/tests/unit/*`

## Acceptance Criteria

- Edit from detail opens Forge with the right minion context.
- Forge can update an existing minion without forcing a recreate-only workflow.
- General chat and Forge chat stay separate enough to avoid state collisions.
- Telegram and bare chat input do not dead-end on strict command parsing.
- Minion lists remain usable for larger inventories.
- Tests define the behavior and pass after implementation.
- Existing deployability is preserved.

## Notes For OpenCode

- Start with failing tests.
- Keep the implementation slices small.
- Prefer route/state reuse over creating a second minion-edit system.
- Do not reintroduce strict Forge-only gating unless a test explicitly requires it.
- Do not delete docs/logs unless replacing them with better, equivalent coverage.

