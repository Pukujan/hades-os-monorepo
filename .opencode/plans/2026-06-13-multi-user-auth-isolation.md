# Plan Log: Multi-User Auth + Hermes Isolation Through TDD

**Date:** June 13, 2026
**Project:** Hades OS
**Focus:** Make Hades safe for multiple users using the same Hermes runtime.
**Method:** TDD first — write failing tests, then implement until green.

## Current Working Note

The original Hades flow is still valid:

```txt
Login
→ Hades app session
→ Socials / Forge / Minions
→ Runtime trigger
→ Hermes executes minion
→ Output returns through the correct channel
```

The change is not to replace this flow.

The change is to enforce this rule everywhere:

```txt
Hermes is shared.
User context is not shared.
```

Hermes should not decide who owns data.
Hades/backend must resolve the authenticated user first, load only that user's scoped data, then call Hermes.

---

## 1. Main Goal

Add a dedicated multi-user auth/isolation layer before deeper Hermes runtime wiring.

This protects:

```txt
minions
assignments
social connections
documents
messages
conversations
execution logs
memory/context
tool results
Hermes prompts
```

from leaking across users.

---

## 2. Required Runtime Rule

Every Hades API/runtime request must follow this shape:

```txt
1. Validate Supabase session
2. Resolve userId + tenantId
3. Query only scoped records
4. Build scoped Hermes context
5. Call Hermes
6. Validate Hermes output
7. Save result under same userId + tenantId
```

No route should call Hermes without a resolved auth context.

---

## 3. Data Ownership Contract

Every user-owned table must include ownership fields.

Required ownership fields:

```txt
user_id
tenant_id
```

Tables that need scoping:

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

For MVP, `tenant_id` can equal `user_id` if there are no teams yet.

---

## 4. TDD Plan

Write failing tests first.

Do not implement until the tests describe the boundary clearly.

TDD loop:

```txt
RED: write failing test
GREEN: implement
REFACTOR: clean without changing behavior
```

Main test categories:

```txt
auth/session tests
tenant-scoped repository tests
Hermes context builder tests
social connection verification tests
runtime trigger tests
cross-user leak prevention tests
audit/log tests
frontend auth-state tests
```

---

## 5. Phase 1 — Auth Session Boundary

### Goal

Every protected Hades API route must require a valid session.

### RED tests

```txt
authMiddleware.test.js

✓ rejects request with no session token
✓ rejects request with invalid session token
✓ accepts request with valid Supabase session
✓ attaches userId to request context
✓ attaches tenantId to request context
✓ does not allow client-provided userId to override session userId
```

### Expected implementation

```txt
requireHadesAuth(req)
  → validates Supabase JWT/session
  → returns { userId, tenantId, authProvider, sessionId }
```

### Acceptance rule

No protected Hades route should trust `user_id` from request body.

---

## 6. Phase 2 — Repository Tenant Scoping

### Goal

Repositories must never return another user's records.

### RED tests

```txt
minionRepository.scope.test.js

✓ findById returns minion owned by current user
✓ findById returns null for another user's minion
✓ listByUser only returns current user's minions
✓ create stores user_id and tenant_id
✓ update rejects another user's minion
✓ delete rejects another user's minion
```

```txt
assignmentRepository.scope.test.js

✓ findActiveAssignment only searches current user's assignments
✓ Discord assignment from User A is invisible to User B
✓ Telegram assignment from User A is invisible to User B
✓ assignment create requires userId and tenantId
```

```txt
conversationRepository.scope.test.js

✓ list conversations returns only current user's conversations
✓ messages from User A are invisible to User B
✓ clear messages only clears current user's conversation
```

### Expected implementation

Every repository method must require context:

```txt
repo.findById({ id, userId, tenantId })
repo.list({ userId, tenantId })
repo.create({ userId, tenantId, data })
repo.update({ id, userId, tenantId, patch })
repo.delete({ id, userId, tenantId })
```

### Acceptance rule

Any repository method that can access user data must require `userId` and `tenantId`.

---

## 7. Phase 3 — Social Connection Isolation

### Goal

Discord and Telegram connections must resolve to the correct Hades user.

### RED tests

```txt
verifySocialAccount.test.js

✓ verifies Discord account linked to current user
✓ rejects unknown Discord account
✓ rejects inactive Discord connection
✓ verifies Telegram account linked to current user
✓ rejects unknown Telegram account
✓ rejects inactive Telegram connection
✓ does not return User A connection for User B
```

```txt
telegramConnectionRepository.test.js

✓ stores encrypted_bot_token
✓ stores token_last4
✓ does not return plaintext token in public response
✓ decrypts token only for runtime send path
✓ marks token_invalid when test fails
✓ marks token_revoked when revoked state is detected
```

```txt
discordConnectionRepository.test.js

✓ stores discord_user_id
✓ stores guild_id
✓ stores channel_id
✓ stores status
✓ filters by userId and tenantId
```

### Expected implementation

```txt
verifySocialAccount({ provider, accountId })
  → query provider connection table
  → require active status
  → return { userId, tenantId, connectionId }
```

### Acceptance rule

Social runtime must reject unknown or inactive accounts before minion lookup.

---

## 8. Phase 4 — Hermes Scoped Context Builder

### Goal

Hermes receives only scoped user context.

### RED tests

```txt
hermesContextBuilder.test.js

✓ builds context with current userId and tenantId
✓ includes only current user's minions
✓ includes only current user's assignments
✓ includes only current user's memory records
✓ includes only current user's social connection metadata
✓ excludes encrypted secrets from prompt context
✓ excludes other users' documents
✓ excludes other users' messages
✓ marks user-provided content as untrusted input
```

### Expected implementation

```txt
buildHermesContext({
  authContext,
  trigger,
  minion,
  assignment
})
```

Returns:

```txt
{
  userId,
  tenantId,
  minion,
  assignment,
  scopedMemory,
  allowedTools,
  untrustedInput,
  requestId
}
```

### Acceptance rule

Hermes should never receive global memory or unfiltered database results.

---

## 9. Phase 5 — Runtime Trigger Isolation

### Goal

Runtime trigger pipeline must preserve auth scope from start to finish.

### RED tests

```txt
minionAssignmentRuntime.auth.test.js

✓ rejects trigger when verifySocialAccount returns null
✓ rejects trigger for inactive connection
✓ finds assignment only under verified userId
✓ does not execute User B minion from User A trigger
✓ passes scoped context to Hermes
✓ saves execution log under verified userId
✓ sends outbound action only through verified connection
```

### Runtime shape

```txt
handleTrigger(body)
  → verifySocialAccount()
  → findActiveAssignment({ userId, tenantId, provider, commandName })
  → buildHermesContext()
  → hermesRuntime.executeMinion()
  → validate output
  → socialClient.sendMessage()
  → save agent_execution
```

### Acceptance rule

A trigger can only execute a minion owned by the verified Hades user.

---

## 10. Phase 6 — Hermes Output Validation

### Goal

Hermes output must be validated before storage or action.

### RED tests

```txt
hermesOutputValidator.test.js

✓ accepts valid outboundActions array
✓ rejects unknown action type
✓ rejects missing required fields
✓ rejects action using unauthorized provider
✓ rejects action targeting another user's channel
✓ rejects raw shell/file action unless explicitly allowed
✓ rejects output with unexpected secret fields
```

### Expected implementation

```txt
validateHermesOutput({
  output,
  authContext,
  assignment,
  allowedActions
})
```

### Acceptance rule

Hermes can propose actions, but Hades validates whether they are allowed.

---

## 11. Phase 7 — Audit + Execution Logs

### Goal

Every trigger execution should produce an audit trail.

### RED tests

```txt
agentExecutionRepository.test.js

✓ creates execution log with user_id and tenant_id
✓ stores provider and trigger type
✓ stores minion_id and assignment_id
✓ stores status success
✓ stores status failed
✓ stores failure_code when rejected
✓ never stores decrypted bot token
✓ list executions only returns current user's logs
```

Required statuses:

```txt
received
verified
assigned
executed
sent
failed
```

Required failure codes:

```txt
missing_auth
unknown_social_account
inactive_connection
no_assigned_minion
hermes_execution_failed
invalid_hermes_output
social_send_failed
```

### Acceptance rule

Failures must be visible without leaking another user's payload or secrets.

---

## 12. Phase 8 — Frontend Auth + Social State Tests

### Goal

Frontend should reflect auth and connection status correctly.

### RED tests

```txt
SocialsPage.test.jsx

✓ shows Discord disconnected state
✓ shows Discord connected state
✓ shows Telegram disconnected state
✓ shows Telegram token_testing state
✓ shows Telegram token_valid state
✓ shows Telegram token_invalid state
✓ disables assignment CTA when social is not connected
✓ does not show another user's social connections after logout/login switch
```

```txt
AppShell.auth.test.jsx

✓ redirects unauthenticated user to login
✓ renders app for authenticated user
✓ clears user-scoped UI state on logout
✓ reloads scoped minions after account switch
```

### Acceptance rule

Switching users must not leave stale User A minions/socials visible for User B.

---

## 13. Phase 9 — Cross-User Leak Regression Suite

### Goal

Add direct tests proving isolation.

### RED tests

```txt
multiUserIsolation.regression.test.js

✓ User A cannot read User B minion
✓ User A cannot update User B minion
✓ User A cannot delete User B minion
✓ User A cannot read User B assignment
✓ User A cannot use User B Discord connection
✓ User A cannot use User B Telegram token
✓ User A trigger cannot execute User B minion
✓ User A Hermes prompt does not include User B memory
✓ User A execution logs do not include User B payload
✓ cache key for User A cannot return User B context
```

### Acceptance rule

This suite must stay green before shipping social runtime.

---

## 14. Suggested Test File List

```txt
backend/src/modules/auth/__tests__/authMiddleware.test.js
backend/src/modules/hades/repositories/__tests__/minionRepository.scope.test.js
backend/src/modules/hades/repositories/__tests__/assignmentRepository.scope.test.js
backend/src/modules/hades/repositories/__tests__/conversationRepository.scope.test.js
backend/src/modules/hades/repositories/__tests__/telegramConnectionRepository.test.js
backend/src/modules/hades/repositories/__tests__/discordConnectionRepository.test.js
backend/src/modules/hades/runtime/__tests__/verifySocialAccount.test.js
backend/src/modules/hades/runtime/__tests__/hermesContextBuilder.test.js
backend/src/modules/hades/runtime/__tests__/minionAssignmentRuntime.auth.test.js
backend/src/modules/hades/runtime/__tests__/hermesOutputValidator.test.js
backend/src/modules/hades/repositories/__tests__/agentExecutionRepository.test.js
backend/src/modules/hades/__tests__/multiUserIsolation.regression.test.js

frontend/src/modules/hades/__tests__/SocialsPage.test.jsx
frontend/src/modules/hades/__tests__/AppShell.auth.test.jsx
```

---

## 15. Minimum Passing Definition

This phase is complete when:

```txt
1. All protected Hades routes require auth
2. All user-owned repository methods require userId + tenantId
3. Social connections are scoped and status-aware
4. Hermes context builder only includes scoped data
5. Runtime trigger cannot cross users
6. Hermes output is validated before action
7. Execution logs are user/tenant scoped
8. Frontend clears scoped state on logout/account switch
9. Cross-user regression suite passes
```

---

## 16. Implementation Order

Use this order:

```txt
1. Write auth middleware tests
2. Implement auth context resolver
3. Write repository scoping tests
4. Add user_id / tenant_id to data access methods
5. Write social connection tests
6. Implement scoped Discord/Telegram connection lookup
7. Write Hermes context builder tests
8. Implement scoped context builder
9. Write runtime trigger isolation tests
10. Wire runtime with auth context
11. Write output validation tests
12. Implement Hermes output validator
13. Write audit/execution tests
14. Implement scoped execution logging
15. Write frontend auth/social state tests
16. Fix UI state leakage
17. Run full regression suite
```

---

## 17. Current Assumption

The plan keeps the existing architecture:

```txt
Hades = product/app/session/data boundary
Hermes = shared runtime/agent executor
Minions = user-facing agents
Socials = one trigger surface
MCP/skills/tools = capabilities Hermes can call
```

The change is only this:

```txt
Before Hermes runs anything,
Hades must prove which user/tenant owns the request.
```

That makes the shared Hermes model safe enough for multi-user MVP work.
