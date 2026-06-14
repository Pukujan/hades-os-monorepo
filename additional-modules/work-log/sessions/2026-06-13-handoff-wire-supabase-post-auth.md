# Handoff: Wire Multi-User Auth Isolation + Supabase Schema Into Live Hades App

## Current Status

The previous phase created auth/isolation building blocks and unit tests. Live app wiring is partially complete (auth guards on routes, scoped repos, runtime deps) — 218/219 tests pass. Supabase schema contract is not finalized yet.

## Non-Negotiable Contract

- Do not redesign architecture.
- Do not change product flow.
- Do not replace Supabase auth.
- Do not make Hermes own auth, tenant boundaries, persistent memory, permissions, or database access.
- Hades = app/session/data boundary; Hermes = shared runtime/agent executor
- Hermes is shared. User context is not shared.

Every protected Hades route must:
1. Validate Supabase session
2. Resolve userId + tenantId
3. Query only scoped records
4. Build scoped Hermes context
5. Call Hermes
6. Validate Hermes output
7. Save result/logs under same userId + tenantId

For MVP: `tenant_id` can equal `user_id`.

---

## Part 1 — Supabase Schema Contract

Create new migration files in `backend/src/modules/hades/migrations/`.

### Ownership fields (every user-owned table)

```sql
user_id uuid not null references auth.users(id) on delete cascade,
tenant_id uuid not null
```

Every live Hades query must filter by both.

### Required tables

| Table | Key columns |
|-------|-------------|
| `hades_minions` | id, user_id, tenant_id, name, description, command_name, category, status, config (jsonb) |
| `hades_assignments` | id, user_id, tenant_id, minion_id, provider, connection_id, guild_id, channel_id, command_name, status |
| `hades_discord_connections` | id, user_id, tenant_id, discord_user_id, discord_username, guild_id, channel_id, status |
| `hades_telegram_connections` | id, user_id, tenant_id, telegram_user_id, telegram_username, telegram_chat_id, bot_id, bot_username, encrypted_bot_token, token_last4, status |
| `hades_conversations` | id, user_id, tenant_id, title, context_type, status |
| `hades_messages` | id, user_id, tenant_id, conversation_id, role, content, metadata (jsonb) |
| `hades_agent_executions` | id, user_id, tenant_id, provider, trigger_type, minion_id, assignment_id, status, failure_code, request_id, input_summary, output_summary, metadata (jsonb) |
| `hades_memory_records` | id, user_id, tenant_id, scope, content, metadata (jsonb) |
| `hades_documents` | id, user_id, tenant_id, filename, mime_type, storage_path, status, metadata (jsonb) |
| `hades_document_chunks` | id, user_id, tenant_id, document_id, chunk_index, content, metadata (jsonb) |
| `hades_tool_results` | id, user_id, tenant_id, tool_name, status, input_summary, output_summary, metadata (jsonb) |

### Required indexes

- `idx_hades_minions_user_tenant` on (user_id, tenant_id)
- `idx_hades_assignments_user_tenant_provider_command` on (user_id, tenant_id, provider, command_name)
- `idx_hades_discord_connections_user_tenant` on (user_id, tenant_id)
- `idx_hades_discord_connections_external` on (discord_user_id)
- `idx_hades_telegram_connections_user_tenant` on (user_id, tenant_id)
- `idx_hades_telegram_connections_external` on (telegram_user_id)
- `idx_hades_conversations_user_tenant` on (user_id, tenant_id)
- `idx_hades_messages_conversation_scope` on (user_id, tenant_id, conversation_id)
- `idx_hades_agent_executions_user_tenant` on (user_id, tenant_id)
- `idx_hades_memory_records_user_tenant` on (user_id, tenant_id)
- `idx_hades_documents_user_tenant` on (user_id, tenant_id)
- `idx_hades_document_chunks_document_scope` on (user_id, tenant_id, document_id)
- `idx_hades_tool_results_user_tenant` on (user_id, tenant_id)

### Required RLS

Enable RLS on all tables. Policy pattern:

```sql
alter table hades_minions enable row level security;
create policy "hades_minions user owns rows"
on hades_minions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

Repeat for all 11 tables. If backend uses service role, still keep app-level `userId + tenantId` filters.

---

## Part 2 — Live App Wiring Contract

### Routes that must require auth

```
GET    /api/hades/bootstrap
POST   /api/hades/chat
POST   /api/hades/assignments
GET    /api/hades/conversations/:id/messages
DELETE /api/hades/conversations/:id/messages
GET    /api/hades/socials
POST   /api/hades/socials/telegram/token
```

- Reject missing auth, reject invalid auth
- Never trust `user_id` or `tenant_id` from request body
- Use `authContext` from session only

### Replace legacy repository

Stop using old non-scoped `hades.repository.js` for user-owned data. Use scoped repositories for all 11 entities.

### Wire runtime dependencies

- `verifySocialAccount` must not be null
- `minionAssignmentRuntime` must receive real deps: verifySocialAccount, assignmentRepo, minionRepo, hermesRuntime, socialClient, executionRepo

### Scope trigger runtime

`POST /api/hades/triggers` must:
1. Verify social account
2. Derive userId + tenantId from social connection
3. Find assignment under that userId + tenantId
4. Find minion under that userId + tenantId
5. Build scoped Hermes context
6. Execute Hermes
7. Send output through verified connection
8. Log execution under same userId + tenantId

---

## Part 3 — Required Tests (8 test files)

Tests already exist in `backend/src/modules/hades/__tests__/`. They use `node:test` + `invokeApp` (no supertest). They need to be verified against the Supabase-backed implementation:

1. `hadesRoutes.auth.wiring.test.js` — 5 tests (reject without auth, pass resolved authContext, don't trust body)
2. `hadesRepository.wiring.test.js` — 2 tests (bootstrap uses scoped repo, assignment lookup uses scoped repo)
3. `hadesIndex.runtimeWiring.test.js` — 4 tests (verifySocialAccount wired, not null; socialClient wired; hermesRuntime wired)
4. `liveTwoUserIsolation.integration.test.js` — 4 tests (User A bootstrap only shows A, User B bootstrap only shows B, A cannot fetch B's messages, A cannot clear B's messages)
5. `liveTriggerIsolation.integration.test.js` — 3 tests (Discord trigger from A executes A minion, from B executes B minion, unknown social trigger never reaches Hermes)
6. `liveChatHermesScope.integration.test.js` — 2 tests (User A/B chat sends only scoped context)
7. `liveAssignmentScope.integration.test.js` — 3 tests (A can assign A minion, A cannot assign B minion, B assignments not in A bootstrap)
8. `liveTelegramTokenScope.integration.test.js` — 2 tests (Telegram token saved under user only, socials route never returns token)

---

## Part 4 — Acceptance Criteria

This phase is complete only when:
1. Existing tests still pass
2. 8 wiring test files pass
3. Supabase migrations exist for scoped Hades tables
4. Protected Hades routes call auth
5. Live app uses scoped repos
6. `verifySocialAccount` is wired
7. Runtime deps are not null
8. bootstrap/chat/assignments are scoped
9. Triggers are scoped by verified social account
10. Telegram token storage is scoped and secret-safe
11. Two different accounts can log in and see only their own Hades data

---

## Part 5 — Manual Verification Scenario

Do not mark auth separated until this works in the running app:
1. Login as User A → create/save minion A → connect Telegram/Discord A
2. Logout
3. Login as User B → confirm minion A is not visible → create/save minion B
4. Logout
5. Login as User A → confirm minion B is not visible
6. Trigger Discord/Telegram for User A → confirm only User A minion runs
7. Trigger Discord/Telegram for User B → confirm only User B minion runs

---

## Implementation Order

TDD: RED → write failing wiring tests → GREEN → add migrations + wire live routes/repos/runtime → REFACTOR

1. Write Supabase migration SQL (`backend/src/modules/hades/migrations/001_hades_tables.sql`)
2. Swap scoped repositories from `{ storage: "memory" }` to `{ storage: "supabase", supabaseClient }`
3. Wire `verifySocialAccount` and runtime deps in `hades/index.js`
4. Verify all tests pass
5. Run `lint:architecture` gate
6. Commit
