# Handoff: Hermes Memory Isolation TDD

**Date:** 2026-06-17 16:37
**Owner:** backend / Hades OS
**Plan:** `work-log/planning/009_2026-06-17_16-37_hermes-memory-isolation-tdd/plan-log.md`
**Study:** `work-log/study-docs/003_2026-06-17_16-37_study-log_hermes-memory-isolation.md`

## Objective

Implement durable Hermes memory with strict per-account isolation. The provided TDD script should go red first and green after implementation:

```bash
npm run test:hades-memory-isolation
```

Backend-local equivalent:

```bash
npm --prefix backend run test:hades-memory-isolation
```

## Required Changes

- Change the delete conversation messages route so unauthorized or unowned conversations return `404 { code: "not_found" }`.
- Add a `createMemoryRecordRepository` for `hades_memory_records`.
- Support memory and Supabase storage modes using the existing Hades repository style.
- Wire the memory repository into Hades scoped repos as `memoryRecords`.
- Update `createHadesService.chat` so `hermes.buildResponse` receives `memoryRecords` filtered by authenticated `userId` and `tenantId`.

## Acceptance Criteria

- `npm run test:hades-memory-isolation` passes.
- `npm --prefix backend test` passes after the implementation is complete.
- User A cannot read, clear, or inject User B conversation or durable memory context.
- Clear-chat removes only owned conversation messages.
- Agent execution records and durable memory records survive clear-chat.

## Notes For opencode

Do not treat `hades.repository.js` `remember`/`recall` as durable memory. That cache is only for idempotency. Do not use `createHadesTestRuntime` memory as production memory. The production target is the existing `hades_memory_records` schema.

Initial red result on 2026-06-17:

- delete messages route returns `200` instead of expected `404` for unowned conversation scope
- `createHadesService.chat` does not pass `memoryRecords` into Hermes input
- `backend/src/modules/hades/repositories/memoryRecordRepository.js` does not exist yet
