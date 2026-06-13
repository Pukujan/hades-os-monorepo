# Handoff: Post-Login UX v4 Visual Alignment

## Metadata

- Date: 2026-06-13
- Project: Hades OS
- Phase: 008
- Target agent: Codex 5.4 mini
- Source prototype: `/Users/teresaguajardo/Downloads/june 2026/june 12/hades_os_post_login_ux_v4.html`
- Source contract: `/Users/teresaguajardo/.codex/attachments/1edfab93-df14-4069-92e7-afdec84791bd/pasted-text.txt`

## Summary

Convert the accepted post-login HTML prototype into the existing React app structure without breaking auth, backend contracts, database contracts, Hermes runtime, Discord bot runtime, or the approved login screen.

This is a frontend-only visual and interaction alignment phase.

## Read First

```txt
work-log/planning/008_2026-06-13_post-login-ux-v4-visual-alignment/README.md
work-log/planning/008_2026-06-13_post-login-ux-v4-visual-alignment/plan-log.md
work-log/planning/008_2026-06-13_post-login-ux-v4-visual-alignment/test-plan.md
work-log/planning/008_2026-06-13_post-login-ux-v4-visual-alignment/audit-log.md
work-log/planning/008_2026-06-13_post-login-ux-v4-visual-alignment/handoff.md
```

## Hard Stop Conditions

Stop and ask before doing any of these:

- editing login files
- editing backend files
- changing API endpoint names
- changing API request/response shapes
- changing database schema
- changing Hermes runtime contracts
- changing Discord bot token behavior
- installing new frontend test dependencies

## TDD Gates

### 1. Write Red View Model Tests

Add `frontend/src/modules/hades/hadesViewModel.test.js`.

Cover:

- active/inactive minion grouping
- frontend-only display field derivation
- destination preview selection
- command syntax separate from preview
- plain description and `!hades` follow-up examples
- notification location metadata

### 2. Write Red Layout Guard Tests

Add `frontend/src/modules/hades/hadesUxLayout.test.js`.

Cover:

- bounded internal scroll classes
- `min-height: 0` on nested scroll regions
- notification dropdown containment
- stable bottom nav
- login template guard

### 3. Implement Helpers And CSS Foundation

Suggested new helper:

```txt
frontend/src/modules/hades/hadesViewModel.js
```

Suggested CSS surfaces:

```txt
.minion-list-scroll
.past-summons-scroll
.notification-log-scroll
.detail-scroll
.activity-log-scroll
```

### 4. Align React Screens

Primary file:

```txt
frontend/src/modules/hades/HadesApp.jsx
```

Secondary file:

```txt
frontend/src/styles/hades.css
```

Match the accepted prototype for:

- Minions
- Forge
- Socials
- Settings
- Minion Detail
- Notification Dropdown
- Theme Switcher

### 5. Browser Acceptance

Check:

- 375px
- 390px
- 430px

Acceptance:

- bottom nav fixed/stable
- active/inactive lists scroll internally
- Minion Slots are not overlapped
- Past Summons scroll internally
- notification dropdown stays inside app bounds
- detail sections are in required order
- destination preview, command syntax, and plain description all appear
- theme switcher still works
- login unchanged

### 6. Full Regression

Run:

```bash
npm --prefix frontend test
npm --prefix frontend run build
npm run test:discord-login-bot-contracts
npm run test:hades-runtime-contracts
```

## Auto-Continue

Continue through all gates without waiting for the user to say continue after each step.

Only pause for a hard stop condition.

## Definition Of Done

The post-login React app visually matches the accepted Hades OS prototype behavior, and the existing auth/backend/runtime/data contracts remain stable.

