# Dev log — Supabase Persist Error Fix

**Date:** 2026-06-14
**Slug:** supabase-persist-fix
**Program:** 006

## Summary

Fixed 500 errors on Railway backend caused by Supabase `hades_messages` table rejecting insert payloads with unknown columns. The root causes were:

1. **`hades.service.js` `createMessage()`** used `msg-<random>` IDs (uuid column rejects), used `createdAt` (column is `created_at`), and included extra app-layer fields (`suggestions`, `actions`)
2. **`conversationRepository.js` `addMessage()`** called `persistMsg(record)` which blindly spread the entire record into the Supabase insert, sending `clientMessageId`, `suggestions`, `actions`, `userId` — none of which exist in the table schema

## Changes

| File | Change |
|------|--------|
| `backend/src/modules/hades/services/hades.service.js` | `createMessage()`: `randomUUID()` for id, `clientMessageId` field, `created_at` key |
| `backend/src/modules/hades/repositories/conversationRepository.js` | `addMessage()`: explicit schema-column-only object passed to `persistMsg()`; `randomUUID()` for both conversation and message IDs |
| `.gitignore` | Added `.vercel` |

## Decisions

- **Fix code, not schema.** The handoff explicitly forbids adding columns to `hades_messages` to hide code bugs. Only persisted DB columns are id, conversation_id, user_id, tenant_id, role, content, created_at.
- **`clientMessageId` is an app-level field**, not a DB column. It lives in the service layer and is sent back to the client for idempotency tracking.

## Tests

Not run — this was a targeted production fix with immediate Railway log verification (no persist errors after deploy).

## Next

Handoff `012` covers App Login MVP, production API routing to Railway, and backend tenant_id UUID fix.
