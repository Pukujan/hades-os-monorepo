# OpenCode Handoff: Multi-User Auth + Hermes Isolation via TDD

## Goal

Implement the next Hades OS backend phase through TDD.

This phase has two required parts:

```txt
1. Multi-user auth + tenant isolation
2. Full RED unit test suite before implementation
```

The existing Hades architecture stays the same.

Do not redesign the app.

## Core Contract

Hades can use one shared Hermes runtime for many users.

But user context must never be shared.

```txt
Hades = product/app/session/data boundary
Hermes = shared runtime/agent executor
Minions = user-facing agents
Socials = one trigger surface
MCP/skills/tools = capabilities Hermes can call
```

Required rule:

```txt
Hermes is shared.
User context is not shared.
```

The backend must own the trust boundary:

```txt
1. Authenticate the user first
2. Resolve userId + tenantId
3. Load only that tenant/user data
4. Build one scoped Hermes context
5. Call Hermes with scoped context
6. Validate Hermes output
7. Save response/logs under the same userId + tenantId
```

Hermes must not decide tenant separation.

## Source Research Summary

Prior Hades research concluded:

```txt
- Backend owns identity
- Backend owns isolation
- Backend owns memory retrieval
- Hermes should be treated as stateless
- Hermes receives only scoped prompt/context for one request
- Shared Hermes runtime is acceptable if every request is isolated before Hermes sees it
```

## Do Not Change

Do not change the product architecture.

Do not turn Hermes into the database, permission engine, queue, or audit system.

Do not redesign Socials, Forge, or Minions.

Do not replace Supabase auth.

Do not remove the existing runtime pipeline.

## What To Add/Fix

### 1. Auth Session Boundary

Every protected Hades backend route must validate the Supabase session.

Implement or fix:

```txt
requireHadesAuth(req)
  → validates Supabase JWT/session
  → returns { userId, tenantId, sessionId }
```

Rules:

```txt
- Reject missing auth
- Reject invalid auth
- Never trust user_id from request body
- tenantId can default to userId for MVP
```

### 2. Tenant-Scoped Repositories

Every user-owned repository method must require:

```txt
userId
tenantId
```

Apply to:

```txt
minions
assignments
discord_connections
telegram_connections
conversations
messages
agent_executions
documents
document_chunks
memory_records
tool_results
```

Repository method shape:

```txt
repo.findById({ id, userId, tenantId })
repo.list({ userId, tenantId })
repo.create({ userId, tenantId, data })
repo.update({ id, userId, tenantId, patch })
repo.delete({ id, userId, tenantId })
```

### 3. Social Connection Isolation

Discord and Telegram verification must resolve back to the correct Hades user.

Implement/fix:

```txt
verifySocialAccount({ provider, accountId })
  → query correct provider connection table
  → require active/connected status
  → return { userId, tenantId, connectionId, provider }
```

Failure codes:

```txt
unknown_social_account
inactive_connection
unsupported_provider
```

### 4. Telegram Token Safety

Telegram token storage must support:

```txt
encrypted_bot_token
token_last4
bot_username
status
```

Rules:

```txt
- Encrypt token at rest
- Never return plaintext token in public API
- Decrypt only inside runtime send path
- Mark token_invalid when testing fails
- Mark token_revoked when revoked
```

### 5. Hermes Scoped Context Builder

Implement/fix:

```txt
buildHermesContext({
  authContext,
  trigger,
  minion,
  assignment,
  scopedMemory,
  allowedTools,
  socialConnection
})
```

Rules:

```txt
- context.userId must equal authContext.userId
- context.tenantId must equal authContext.tenantId
- reject minion scope mismatch
- reject assignment scope mismatch
- reject memory scope mismatch
- exclude encrypted secrets
- mark user content as untrusted input
```

### 6. Runtime Trigger Isolation

The runtime pipeline must stay scoped from trigger to send.

Required shape:

```txt
handleSocialTrigger(body)
  → verifySocialAccount()
  → findActiveAssignment({ userId, tenantId, provider, commandName })
  → minionRepository.findById({ minionId, userId, tenantId })
  → buildHermesContext()
  → hermesRuntime.executeMinion()
  → validateHermesOutput()
  → socialClient.sendMessage()
  → save agent_execution under same userId + tenantId
```

Failure codes:

```txt
unknown_social_account
inactive_connection
no_assigned_minion
minion_not_found
hermes_execution_failed
invalid_hermes_output
social_send_failed
```

### 7. Hermes Output Validation

Hermes output must be validated before storage/action.

Implement/fix:

```txt
validateHermesOutput({
  output,
  authContext,
  assignment,
  allowedActions
})
```

Reject:

```txt
unknown action type
missing required fields
provider mismatch
channel mismatch
secret fields
unauthorized raw shell/file actions
```

### 8. Execution Logs

Every runtime trigger should create scoped execution logs.

Required fields:

```txt
user_id
tenant_id
provider
trigger_type
minion_id
assignment_id
status
failure_code
created_at
```

Never store:

```txt
decrypted bot token
encrypted bot token
raw secret payloads
```

### 9. Frontend Auth/State Safety

Frontend must not leak stale user state after logout/account switch.

Cover:

```txt
SocialsPage states
AppShell auth redirect
clear scoped UI state on logout
reload minions after account switch
```

## TDD Requirement

Write RED tests first.

Do not implement until tests fail for the expected reason.

Required test files:

```txt
backend/src/modules/auth/__tests__/authMiddleware.test.js

backend/src/modules/hades/repositories/__tests__/minionRepository.scope.test.js
backend/src/modules/hades/repositories/__tests__/assignmentRepository.scope.test.js
backend/src/modules/hades/repositories/__tests__/conversationRepository.scope.test.js
backend/src/modules/hades/repositories/__tests__/telegramConnectionRepository.test.js
backend/src/modules/hades/repositories/__tests__/discordConnectionRepository.test.js
backend/src/modules/hades/repositories/__tests__/agentExecutionRepository.test.js

backend/src/modules/hades/runtime/__tests__/verifySocialAccount.test.js
backend/src/modules/hades/runtime/__tests__/hermesContextBuilder.test.js
backend/src/modules/hades/runtime/__tests__/minionAssignmentRuntime.auth.test.js
backend/src/modules/hades/runtime/__tests__/hermesOutputValidator.test.js

backend/src/modules/hades/__tests__/multiUserIsolation.regression.test.js

frontend/src/modules/hades/__tests__/SocialsPage.test.jsx
frontend/src/modules/hades/__tests__/AppShell.auth.test.jsx
```

## Required Test Coverage

### Auth tests

```txt
✓ rejects request with no session token
✓ rejects request with invalid session token
✓ accepts valid Supabase session
✓ attaches userId
✓ attaches tenantId
✓ does not allow client-provided userId to override session userId
```

### Repository scope tests

```txt
✓ User A can read User A data
✓ User A cannot read User B data
✓ User A cannot update User B data
✓ User A cannot delete User B data
✓ create stores user_id and tenant_id
✓ list only returns current user's data
```

### Social connection tests

```txt
✓ verifies Discord account linked to current user
✓ rejects unknown Discord account
✓ rejects inactive Discord connection
✓ verifies Telegram account linked to current user
✓ rejects unknown Telegram account
✓ rejects inactive Telegram connection
✓ does not expose Telegram plaintext token publicly
✓ decrypts Telegram token only for runtime send path
```

### Hermes context tests

```txt
✓ builds context with current userId and tenantId
✓ includes only current user's minion
✓ rejects minion from another user
✓ rejects assignment from another tenant
✓ includes only scoped memory
✓ rejects memory from another user
✓ excludes encrypted secrets
✓ marks user content as untrusted input
```

### Runtime isolation tests

```txt
✓ rejects unknown social account
✓ rejects inactive connection
✓ searches assignment under verified userId/tenantId
✓ returns no_assigned_minion when none exists
✓ does not execute another user's minion
✓ passes scoped context to Hermes
✓ sends outbound action only through verified connection
✓ returns social_send_failed when send fails
```

### Hermes output validation tests

```txt
✓ accepts valid outboundActions
✓ rejects unknown action type
✓ rejects missing required fields
✓ rejects unauthorized provider
✓ rejects wrong channel
✓ rejects raw shell/file action unless allowed
✓ rejects secret fields
```

### Execution log tests

```txt
✓ creates execution log with user_id and tenant_id
✓ stores provider and trigger type
✓ stores minion_id and assignment_id
✓ stores success status
✓ stores failed status + failure_code
✓ never stores decrypted bot token
✓ list executions only returns current user's logs
```

### Cross-user regression tests

```txt
✓ User A cannot read User B minion
✓ User A cannot update User B minion
✓ User A cannot delete User B minion
✓ User A cannot read User B assignment
✓ User A cannot use User B Discord connection
✓ User A cannot use User B Telegram token
✓ User A trigger cannot execute User B minion
✓ User A Hermes context does not include User B memory
✓ User A execution logs do not include User B payload
✓ cache key for User A cannot return User B context
```

### Frontend tests

```txt
✓ shows Discord disconnected state
✓ shows Discord connected state
✓ shows Telegram disconnected state
✓ shows Telegram token_testing state
✓ shows Telegram token_valid state
✓ shows Telegram token_invalid state
✓ redirects unauthenticated user to login
✓ renders app for authenticated user
✓ clears scoped UI state on logout
✓ reloads scoped minions after account switch
```

## Acceptance Criteria

This phase is complete only when:

```txt
1. All protected Hades routes require auth
2. All user-owned repository reads/writes are scoped by userId + tenantId
3. Social connections are status-aware and scoped
4. Telegram tokens are encrypted and never exposed publicly
5. Hermes context includes only scoped user data
6. Runtime trigger cannot cross users
7. Hermes output is validated before action
8. Execution logs are scoped and secret-safe
9. Frontend clears stale user state on logout/account switch
10. Full test suite passes
```

## Test Command

Use the repo's test command. If Vitest:

```bash
npx vitest run
```

or:

```bash
npm test -- --run
```

## Final Instruction

Implement through TDD:

```txt
RED → write failing tests
GREEN → implement smallest working fix
REFACTOR → clean without changing behavior
```

Do not skip the RED tests.
Do not implement broad unrelated changes.
Do not change the product architecture.
