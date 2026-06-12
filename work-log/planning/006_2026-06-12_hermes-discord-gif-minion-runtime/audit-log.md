# Audit Log: Hermes Discord GIF Minion Runtime

**Phase:** 006  
**Date:** 2026-06-12  
**Related plan:** `work-log/planning/006_2026-06-12_hermes-discord-gif-minion-runtime/plan-log.md`  
**Related handoff:** `work-log/handoffs/010_2026-06-12_12-30_handoff_hermes-discord-gif-minion-runtime.md`

## Purpose

This audit records the path from the Hermes/Discord/runtime questions to the dated planning package that 5.4 mini can implement.

## What We Studied

- `backend/src/modules/hades/services/hermes.service.js`
- `backend/src/modules/hades/services/hermesRuntime.service.js`
- `backend/src/modules/hades/repositories/hades.repository.js`
- `backend/src/modules/hades/services/hades.service.js`
- `backend/src/modules/auth/services/createHermesJobFromRequest.js`
- `backend/src/modules/auth/tests/unit/auth.hermes.context.test.js`
- `backend/src/modules/hades/tests/contracts/hades.discord-gif.contract.mjs`
- `backend/src/modules/hades/tests/contracts/hades.minion-assignment-runtime.contract.mjs`
- `work-log/planning/005_2026-06-11_hermes-runtime-wrapper-tdd/*`
- `work-log/handoffs/005_2026-06-12_hermes-runtime-wrapper-tdd.md`

## Work Process Summary

### 1. Hermes is not the database

The backend still treats Hermes as a structured runtime that produces JSON drafts. Hades owns persistence, auth context, and assignment state.

### 2. Saved minions are the reusable unit

We clarified the model:

- Hermes drafts a command spec.
- Hades saves that spec as a minion.
- Assignments connect the minion to a provider, social account, and channel.
- Later triggers resolve the assignment and execute the saved minion.

### 3. Discord login is not Discord delivery

Supabase Discord OAuth proves the user is signed in to the app. That is separate from actually sending a Discord message or GIF from a minion runtime.

### 4. GIFs need a provider adapter

There is no live GIF provider integration yet. The runtime must get the GIF URL from a provider adapter, then send it through the Discord client.

## Gap Table

| Area | Current state | Needed next |
|---|---|---|
| Hermes command flow | Returns structured draft JSON | Return reusable command/minion schema plus outbound actions |
| Minion reuse | Saved minions exist | Resolve active assignments and execute saved minions later |
| Discord delivery | OAuth login exists | Real Discord send path for command results |
| GIF delivery | Simulated parser/test output | Real GIF provider adapter |
| Persistence | Repository supports Supabase | Live backend must opt into Supabase storage |
| Safety | Backend auth context is verified | Keep other users' minions and secrets out of runtime context |

## Important Decisions

- Keep the live Hades backend as the owner of minions and assignments.
- Do not turn every command into a Hermes skill.
- Keep the phase gated by tests first.
- Keep the new runtime service injectable so Discord, GIF, Hermes, and repository pieces can be mocked.

## Files Created For This Phase

- `work-log/planning/006_2026-06-12_hermes-discord-gif-minion-runtime/README.md`
- `work-log/planning/006_2026-06-12_hermes-discord-gif-minion-runtime/plan-log.md`
- `work-log/planning/006_2026-06-12_hermes-discord-gif-minion-runtime/audit-log.md`
- `work-log/planning/006_2026-06-12_hermes-discord-gif-minion-runtime/design-log.md`
- `work-log/planning/006_2026-06-12_hermes-discord-gif-minion-runtime/handoff.md`
- `work-log/planning/006_2026-06-12_hermes-discord-gif-minion-runtime/manifest.json`

## Remaining Risk

- The new contract tests are red by design until the runtime services exist.
- The repo still needs a live decision on whether GIFs come from Giphy, Tenor, or another provider.
- The live backend still needs Supabase storage wired at module registration time.

