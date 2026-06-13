# Handoff: Post-Login UX v4 Visual Alignment

## Summary

Implement the accepted post-login Hades OS UX from `hades_os_post_login_ux_v4.html` inside the existing React app.

This is a frontend visual and interaction alignment task only. Do not redesign the login screen, auth flow, backend APIs, data contracts, Hermes runtime, Discord bot runtime, or database schema.

## Source Of Truth

Read these first:

```txt
/Users/teresaguajardo/Downloads/june 2026/june 12/hades_os_post_login_ux_v4.html
/Users/teresaguajardo/.codex/attachments/1edfab93-df14-4069-92e7-afdec84791bd/pasted-text.txt
```

Then inspect current app files:

```txt
frontend/src/modules/hades/HadesApp.jsx
frontend/src/modules/hades/hadesApi.js
frontend/src/modules/hades/hadesData.js
frontend/src/styles/hades.css
```

## Hard Guardrails

Do not modify:

```txt
frontend/src/auth/loginTemplate.html
frontend/src/auth/LoginPage.jsx
frontend/src/auth/AuthProvider.jsx
backend/**
```

Exception: only touch auth/backend if the user explicitly gives a new instruction later.

Do not change:

```txt
API endpoint names
request/response shapes
auth flow
backend assumptions
database schema
runtime/orchestration logic
Discord bot token handling
Hermes service contracts
```

If a visual display field is missing, derive it in frontend view model code.

## Implementation Target

Make the real post-login app match the accepted prototype behavior for:

- Minions
- Forge
- Socials
- Settings
- Minion Detail
- Notification Dropdown
- Theme Switcher

Keep the approved visual identity:

- dark forge/underworld app shell
- Ember Forge default
- Arcane Night and Grove themes
- warm rounded cards
- pixel/fantasy accents
- mobile-first bottom navigation
- fixed/stable bottom nav

## User-Facing Language Rule

Do not show technical backend/runtime terms in normal UI.

Avoid:

```txt
MCP
runtime
schema
pipeline
tool invocation
agent protocol
```

Use plain product language:

```txt
Manual summon
Automatic
Discord #cat-chaos
Gmail alert
Waiting for approval
Last checked
Open location
```

## TDD Phase Gates

### Phase 1: Red View Model Tests

Add tests that fail before implementation.

Required contracts:

- Active and inactive minions are split into separate lists.
- Minion display cards can be built from current backend state.
- Display-only fields do not mutate backend payload objects.
- Destination preview resolves to `discord`, `gmail`, `automation`, or `hades_chat`.
- Command syntax remains separate from preview.
- Plain description includes normal language plus `!hades` follow-up examples.
- Notification items include exact location metadata and open-location labels.

Suggested files:

```txt
frontend/src/modules/hades/hadesViewModel.js
frontend/src/modules/hades/hadesViewModel.test.js
```

### Phase 2: Red Layout Guard Tests

Add tests for CSS/source guardrails.

Required contracts:

- minion list panel has bounded internal scroll
- past summons panel has bounded internal scroll
- notification log area has bounded internal scroll
- detail body has bounded internal scroll
- activity log has bounded internal scroll
- nested app shell areas use `min-height: 0`
- bottom nav remains stable in the app shell
- approved login template still exists and is not part of this phase

Suggested file:

```txt
frontend/src/modules/hades/hadesUxLayout.test.js
```

### Phase 3: Green View Model + CSS Foundation

Implement helper functions and CSS containers only enough to satisfy Phase 1 and 2.

Do not jump into broad JSX changes until these pass.

### Phase 4: React Screen Alignment

Update the React post-login screens.

Minions screen must include:

- Speak to Hades card
- Your Minions section
- Active / Inactive tabs
- bounded scrollable minion list panel
- Minion Slots section

Forge screen must include:

- Forge your minion chat/card
- template chips
- summon input
- required details/config preview
- Your Past Summons bounded scroll panel

Minion Detail must use this order:

1. Minion Header
2. Status / Mode Card
3. Source / Channel Card
4. Destination Preview Card
5. Command Syntax Card
6. Plain Description Card
7. Actions
8. Activity Log

Notification dropdown must include:

- Manual / Auto tabs
- scrollable logs
- exact location metadata
- open-location button
- inline mock context panel after open-location is clicked
- click log opens relevant Minion Detail

### Phase 5: Browser Acceptance

Verify at:

- 375px
- 390px
- 430px

Check:

- bottom nav stays fixed
- content does not slide under bottom nav
- minion cards do not overlap Minion Slots
- past summons do not overlap bottom nav
- notification dropdown stays inside app bounds
- minion detail sections are ordered correctly
- Discord preview looks like a small chat
- Gmail preview looks like compact email
- automation preview explains checked/sent state
- command syntax and plain description are both visible
- theme switcher still works
- login screen is untouched

### Phase 6: Full Regression

Run:

```bash
npm --prefix frontend test
npm --prefix frontend run build
npm run test:discord-login-bot-contracts
npm run test:hades-runtime-contracts
```

## Auto-Continue Rule

Continue through all phases without asking the user to say continue after every phase.

Pause only for:

- required login file edits
- required backend/API edits
- required database/schema edits
- required dependency installation
- missing prototype file
- visual contract conflict that needs product owner choice

## Implementation Notes

Use frontend-only view model helpers for display fields.

Example fields:

```js
{
  destinationLabel,
  previewType,
  previewMessages,
  modeLabel,
  statusLabel,
  commandSyntax,
  plainDescription,
  followUpExamples
}
```

The current backend bootstrap mapper should keep preserving backend data as-is. Do not rewrite it to match prototype fixture data.

Keep `/app/inbox` and existing direct routes working even if the new notification dropdown becomes the primary visual pattern.

## Definition Of Done

The real post-login React app feels like the accepted Hades OS prototype, and all existing auth/backend/runtime contracts remain stable.

