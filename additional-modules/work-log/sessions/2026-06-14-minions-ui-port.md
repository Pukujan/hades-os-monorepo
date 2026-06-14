# 2026-06-14 — Minions UI/UX port (in progress)

## What changed
- Created `frontend/src/modules/hades/minionPreviewData.js` with mock minions, run logs, preview outputs, and connected destinations.
- Created four new components:
  - `MinionSlots.jsx` — 4-slot active grid.
  - `MinionListScreen.jsx` — 4×4 minion list.
  - `MinionDetailScreen.jsx` — detail with How to Summon, Summon Preview, Control, Activity, Logs link, inline Test Run modal.
  - `MinionLogsScreen.jsx` — full run logs screen.
- Updated `HadesPrototypeApp.jsx`:
  - Added imports for new components + `useParams`.
  - Added `activateMinion`/`deactivateMinion` helpers to context.
  - Added route wrappers and new `<Route>` entries.
  - Rewrote `MinionsScreen` to show the slot grid and route-based navigation.
  - Removed inline `MinionDetailView` overlay in favor of route navigation.
- Added CSS in `frontend/src/styles/hadesPrototype.css` for slots, list tiles, detail view, summon box, preview output, controls, activity logs, modal, destination grid.
- Removed `hades_os_post_login_ux_v4.html` from repo root.

## Validation
- 101 frontend tests pass.
- `npm run build` clean.

## Remaining before completion
- Browser smoke test `/app/minions`, `/app/minions/list`, `/app/minions/:id`, `/app/minions/:id/logs`.
- Fix any runtime layout or navigation regressions.
- Verify `openMinionDetail` navigation from slot tiles works as expected.

## Files
- `frontend/src/modules/hades/HadesPrototypeApp.jsx`
- `frontend/src/modules/hades/minionPreviewData.js`
- `frontend/src/modules/hades/MinionSlots.jsx`
- `frontend/src/modules/hades/MinionListScreen.jsx`
- `frontend/src/modules/hades/MinionDetailScreen.jsx`
- `frontend/src/modules/hades/MinionLogsScreen.jsx`
- `frontend/src/styles/hadesPrototype.css`
- `hades_os_post_login_ux_v4.html` (deleted)
