# Hermes Memory Isolation Study Log

**Date:** 2026-06-17 16:37
**Topic:** How Hermes memory works now, and where account isolation can leak
**Status:** Study log for repo reference; paired with planning phase `009_2026-06-17_16-37_hermes-memory-isolation-tdd`

## Question

Why can Hades/Hermes appear to remember one user's identity or context when another logged-in account sends a message?

## Current Findings

Hermes currently receives short-term conversation context from Hades chat flow. In `createHadesService.chat`, the service resolves `userId` and `tenantId` from `authContext`, finds or creates a scoped conversation, loads recent messages from the scoped conversation repository, and sends those messages into `hermes.buildResponse`.

The production schema already defines `hades_memory_records` with `user_id`, `tenant_id`, `scope`, `content`, and `metadata`, plus RLS policies scoped to `auth.uid() = user_id`. I did not find a production repository or service path that writes to or reads from `hades_memory_records`.

There are several memory-like concepts that are easy to confuse:

- **Conversation context:** recent `hades_messages` rows, scoped by `user_id`, `tenant_id`, and `conversation_id`.
- **Agent execution history:** `hades_agent_executions`, scoped by `user_id` and `tenant_id`; currently treated like long-lived context in some tests.
- **Idempotency cache:** `remember`/`recall` inside `hades.repository.js`; this is not user memory, only request de-duplication.
- **Test harness memory:** `createHadesTestRuntime` exposes `app.memory`, `contextCache`, and `buildContextForUser`; this is useful for regression tests but is not the production memory store.
- **Durable user memory:** intended `hades_memory_records`; schema exists, runtime integration is missing.

## Auth And Isolation

Authenticated app routes should trust only the backend-authenticated `authContext`. Existing auth tests already prove that client-supplied `user_id` and `tenant_id` cannot override the verified identity.

The scoped repositories generally filter by `userId` and `tenantId`. Existing tests cover minions, assignments, social connections, executions, bootstrap, and some conversation behavior.

## Gap

The runtime does not yet have a clear durable memory contract. A future implementation needs a real memory repository, a service-level read path into Hermes, and tests proving one account's memory never appears in another account's chat context.

The clear-chat route also has an ambiguous ownership contract. `get conversation messages` returns `404` when the current user cannot access a conversation, but `delete conversation messages` currently treats a `null` clear result as a successful stale clear. That can hide cross-account attempts behind a successful response.

## Conclusion

The main bug class is not only "memory leak"; it is "memory vocabulary drift." Conversation history, execution logs, idempotency, test-only memory, and durable memory need separate names and separate tests. The next TDD slice should make those boundaries explicit before implementing durable memory.
