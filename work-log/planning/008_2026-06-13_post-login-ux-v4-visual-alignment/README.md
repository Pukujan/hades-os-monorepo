# Post-Login UX v4 Visual Alignment

## Metadata

- Date: 2026-06-13
- Project: Hades OS
- Phase: 008
- Status: planned
- Owner intent: convert the accepted post-login HTML prototype into the existing React app without breaking auth, backend contracts, or the approved login screen.
- Source prototype: `/Users/teresaguajardo/Downloads/june 2026/june 12/hades_os_post_login_ux_v4.html`
- Source contract: `/Users/teresaguajardo/.codex/attachments/1edfab93-df14-4069-92e7-afdec84791bd/pasted-text.txt`

## Purpose

This phase gives 5.4 mini a safe, TDD-first implementation lane for the accepted post-login UX.

The task is visual and interaction alignment only. It should make the real React app feel like the accepted `hades_os_post_login_ux_v4.html` prototype while keeping the current app architecture and data flow stable.

## Scope

Included:

- Minions screen
- Forge screen
- Socials screen
- Settings screen
- Minion Detail screen
- Notification dropdown
- Theme switcher
- Scroll containment
- Card/list presentation
- Frontend-only view model adapters for display fields

Excluded:

- Login screen changes
- Signup screen changes
- Auth flow changes
- Backend route/API changes
- Database schema changes
- Hermes runtime/orchestration changes
- Discord bot/runtime changes

## Files

- `plan-log.md`: phased implementation plan.
- `test-plan.md`: TDD contract and example tests.
- `handoff.md`: exact implementation handoff for 5.4 mini.
- `audit-log.md`: review notes from the request and current repo.
- `manifest.json`: machine-readable phase summary.

