# Hades Auth Isolation Wiring Tests

Goal: prove the existing auth/isolation building blocks are actually wired into the live app.

---

## 1. `backend/src/modules/hades/__tests__/hadesRoutes.auth.wiring.test.js`

### Route auth wiring

- bootstrap rejects missing auth
- chat rejects missing auth
- assignments reject missing auth
- bootstrap receives authContext
- chat ignores user_id/tenant_id from request body

## 2. `backend/src/modules/hades/__tests__/hadesRepository.wiring.test.js`

### Repository wiring

- bootstrap uses scoped minion repository
- bootstrap does not use legacy unscoped repository
- assignment lookup uses scoped assignment repository

## 3. `backend/src/modules/hades/__tests__/hadesIndex.runtimeWiring.test.js`

### Runtime wiring

- createVerifySocialAccount is wired
- verifySocialAccount is not null
- socialClient is not null
- hermesRuntime is not null
- runtime fails fast if required deps are missing

## 4. `backend/src/modules/hades/__tests__/liveTwoUserIsolation.integration.test.js`

### Two-user app isolation

- User A bootstrap only returns User A data
- User B bootstrap only returns User B data
- User A cannot fetch User B messages
- User A cannot clear User B messages

## 5. `backend/src/modules/hades/__tests__/liveTriggerIsolation.integration.test.js`

### Trigger isolation

- Discord trigger from User A executes only User A minion
- Discord trigger from User B executes only User B minion
- unknown social trigger never reaches Hermes

## 6. `backend/src/modules/hades/__tests__/liveChatHermesScope.integration.test.js`

### Chat Hermes scope

- User A chat sends only User A scoped context to Hermes
- User B chat sends only User B scoped context to Hermes

## 7. `backend/src/modules/hades/__tests__/liveAssignmentScope.integration.test.js`

### Assignment scope

- User A can assign User A minion
- User A cannot assign User B minion
- User B assignments do not appear in User A bootstrap

## 8. `backend/src/modules/hades/__tests__/liveTelegramTokenScope.integration.test.js`

### Telegram token scope

- User A Telegram token is saved under User A only
- User B cannot see User A Telegram bot connection
- public socials route never returns plaintext token
- public socials route never returns encrypted token
