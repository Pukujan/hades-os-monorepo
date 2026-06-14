# Session archive — 2026-06-14-vite-env-var-injection-fix

- **Archived:** 2026-06-14T20:46:13.199+00:00
- **Updated:** 2026-06-14T23:30:00.000+00:00
- **Peak usage:** 0 tokens
- **Budget file:** `additional-modules/buildplan/context_budget.json`

## Changes

- Fixed `hades.service.js` `createMessage()`: replace `msg-${randomUUID().slice(0,8)}` with `randomUUID()`, add `clientMessageId` field, rename `createdAt` to `created_at`
- Fixed `conversationRepository.js` `addMessage()`: persistMsg now sends only schema columns (no blind spread), replaced custom `createId("msg")`/`createId("conv")` with `randomUUID()`
- Added `.vercel` to `.gitignore`

## Problem

Supabase persist errors in Railway logs: `hades_messages` table only has columns id, conversation_id, user_id, tenant_id, role, content, created_at. The code was sending extra fields (clientMessageId, suggestions, actions, createdAt) causing column-not-found errors. Also, message IDs used `msg-` prefix format not compatible with uuid column.

## Next session

- App Login MVP (email/password signup/login, Google OAuth, logout, protected routes, session restore)
- Frontend API URL resolver to route production chat requests to Railway
- Backend tenant_id UUID mapping fix (remove `tenant_<uuid>` prefix)
- Supabase dashboard configuration documentation
