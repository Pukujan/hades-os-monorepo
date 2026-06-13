# Handoff: Hermes Discord GIF Minion Runtime

## Summary

Implement the next Hades runtime slice with TDD:

- convert Hermes command drafts into reusable minions
- assign minions to socials and channels
- resolve saved assignments later from Discord commands or automation triggers
- send real GIFs through a provider adapter
- persist execution and delivery state in Hades storage

## Canonical Handoff

The canonical implementation brief also lives at:

- `work-log/handoffs/010_2026-06-12_12-30_handoff_hermes-discord-gif-minion-runtime.md`

## TDD Gates

1. `npm run test:hades-discord-gif-contract`
2. `npm run test:hades-minion-assignment-runtime-contract`
3. `npm run test:hades-runtime-contracts`

## Required Behavior

- Discord-authenticated users can trigger minions tied to their own assignments.
- Hermes returns a structured command schema, not freeform text alone.
- Hades saves the minion and assignment, not Hermes skills.
- Cross-user command collisions fail closed.
- Unassigned triggers do not reach Hermes.
- GIF provider keys remain server-side only.

## Status Update

Implemented and verified:

- `backend/src/modules/hades/services/discordHermesCommandFlow.service.js`
- `backend/src/modules/hades/services/minionAssignmentRuntime.service.js`
- `backend/src/modules/hades/repositories/hades.repository.js` active assignment and outbound delivery support

Verified green:

- `npm run test:hades-discord-gif-contract`
- `npm run test:hades-minion-assignment-runtime-contract`
- `npm run test:hades-runtime-contracts`

## Stop Conditions

- destructive actions
- live external Hermes install mutation
- missing credentials that cannot be mocked
- repeated blocker that cannot be resolved locally
