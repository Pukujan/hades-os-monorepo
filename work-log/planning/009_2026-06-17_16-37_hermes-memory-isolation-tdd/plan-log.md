# Hermes Memory Isolation TDD Plan Log

**Plan ID:** `009_2026-06-17_16-37_hermes-memory-isolation-tdd`
**Source study:** `work-log/study-docs/003_2026-06-17_16-37_study-log_hermes-memory-isolation.md`
**Handoff:** `work-log/handoffs/008_2026-06-17_16-37_handoff_hermes-memory-isolation-tdd.md`
**Test script:** `npm run test:hades-memory-isolation`

## Goal

Close the gap between existing auth-scoped chat behavior and a real durable Hermes memory layer. The first implementation should make account isolation observable through tests before changing behavior.

## Current State

- Conversation and message repositories scope by `userId` and `tenantId`.
- Agent execution history scopes by `userId` and `tenantId`.
- `hades_memory_records` exists in the Supabase schema but has no production repository/service integration.
- Existing tests cover broad multi-user isolation, but durable memory is only represented by test harness helpers.
- The delete messages route currently treats a scoped `null` result as a successful stale clear.

## Required Behavior

- `DELETE /api/hades/conversations/:id/messages` must return `404 { code: "not_found" }` when the authenticated user does not own that conversation.
- Hermes chat input must include `memoryRecords` from a durable memory repository, filtered by authenticated `userId` and `tenantId`.
- Durable memory records must persist and list by `userId` and `tenantId`.
- Clear-chat must clear only owned conversation messages and must not delete agent executions or durable memory records.

## Implementation Notes

- Add `createMemoryRecordRepository` beside the other Hades repositories.
- Wire it in the Hades module as `scopedRepos.memoryRecords`.
- Keep the storage adapter shape consistent with existing repositories: memory mode first, Supabase mode using `hades_memory_records`.
- Pass `memoryRecords` into `hermes.buildResponse` without including records from other accounts.
- Keep Telegram/minion routing out of this slice unless the new tests reveal a shared dependency.
