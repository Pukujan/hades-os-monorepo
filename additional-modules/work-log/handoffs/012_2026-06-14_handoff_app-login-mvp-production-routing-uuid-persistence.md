# OpenCode Handoff: App Login MVP + Production API Routing + UUID Persistence Fix

## Goal

Ship App Login MVP (email/password, Google OAuth, logout, protected routes, session restore) + fix production chat routing to Railway + fix UUID persistence for tenant_id and message IDs.

## Current Status

### Done (this session)
- CORS fix deployed (trailing slash removed)
- Railway project linked (`virtuous-tranquility`, deploys via `railway up --service hades-os-monorepo`)
- `conversationRepository.js` persistMsg now sends only schema columns (id, conversation_id, user_id, tenant_id, role, content, created_at)
- `hades.service.js` createMessage() uses `randomUUID()` for id and includes `clientMessageId` field (not as DB id)
- No new Supabase persist errors in latest Railway logs immediately after deploy
- `.gitignore` includes `.vercel` pattern

### Known Issues
- Production chat requests hit Vercel (405 error) instead of Railway — VITE_API_BASE_URL in Vercel env set to Vercel URL, not Railway
- Only Discord OAuth works. Email/password and Google OAuth not wired
- Tenant ID uses `tenant_<uuid>` format which is rejected by uuid column — must use raw Supabase user UUID
- `hades_messages` table schema only has id, conversation_id, user_id, tenant_id, role, content, created_at — no extra app-layer columns

## Constraints

- Do **not** create a new chat table
- Do **not** change uuid columns to text to hide code bugs
- Do **not** expose backend secrets (service role key, OpenRouter key) to frontend
- Do **not** use optional/dynamic `import.meta.env` access — direct Vite env access only
- Do **not** add Apple/Telegram login in this slice

## Requirements

### 1. Frontend API URL Resolver
- Create `frontend/src/api/apiUrl.js` with `getApiBaseUrl()` and `apiUrl(path)`:
  - `VITE_API_BASE_URL` in production
  - `http://localhost:3001` in development
  - Strip trailing slash
  - Never use `import.meta.env?.VITE_*`
- Write red test first

### 2. App Login MVP — Auth Redirects
- Create `frontend/src/auth/authRedirects.js` with `getAfterLoginUrl()`:
  - Default: `/app`
  - Accept optional `returnTo` query param
- Write red test first

### 3. App Login MVP — Auth Client
- Create `frontend/src/auth/authClient.js`:
  - `signUpWithEmail(email, password)`
  - `signInWithEmail(email, password)`
  - `signInWithGoogle()`
  - `signInWithDiscord()` (optional, already works)
  - `signOutUser()`
  - `getCurrentSession()` (restore session on page load)
- Write red test first (mock Supabase client)

### 4. Backend tenant_id UUID Mapping Fix
- Stop using `tenant_<uuid>` prefix in `authMiddleware.js`
- `requireHadesAuth()` should derive `tenant_id` as raw Supabase user UUID
- Handle both `user.tenantId`, `user.app_metadata?.tenant_id`, and `userId` fallback — all as raw UUID
- Write red test first

### 5. LoginPage UI Update
- Show only MVP providers: Email/password form + Google OAuth button + Discord OAuth button
- Wire to `authClient.js` methods
- Handle loading/error states

### 6. hadesApi.js — Use apiUrl()
- Update `frontend/src/modules/hades/hadesApi.js` to use `apiUrl()` from shared resolver
- Remove hardcoded `/api/hades/chat/general` etc. (use resolved base URL)

### 7. Tests
- Unit tests for all the above (red first)
- Build artifact test: verify Railway URL is baked into production bundle, no `import.meta?.env` in dist
- Production smoke test after deploy

### 8. Supabase Dashboard Configuration Docs
- Document Email/Password provider setup
- Document Google OAuth provider setup
- Document Site URL and redirect URLs in `docs/AUTH.md` or `docs/DEPLOY.md`

## Relevant Files

- `frontend/src/api/apiUrl.js`: **TO CREATE** — shared API URL resolver
- `frontend/src/auth/authRedirects.js`: **TO CREATE** — redirect URL helpers
- `frontend/src/auth/authClient.js`: **TO CREATE** — Supabase auth wrappers
- `frontend/src/auth/LoginPage.jsx` or equivalent: **TO UPDATE** — MVP provider scope
- `frontend/src/modules/hades/hadesApi.js`: **TO UPDATE** — use apiUrl
- `backend/src/modules/hades/repositories/conversationRepository.js`: already fixed persistMsg
- `backend/src/modules/hades/services/hades.service.js`: already fixed createMessage
- `backend/src/modules/auth/services/authMiddleware.js`: **TO FIX** — tenant_id derivation
- `docs/AUTH.md` or `docs/DEPLOY.md`: **TO UPDATE** — Supabase provider config

## Critical Context

- Railway backend: `https://hades-os-monorepo-production.up.railway.app`
- Frontend (Vercel): `https://hades-os-monorepo.vercel.app`
- Supabase project: `herzhouazsssxaqqbmiq.supabase.co`
- Fix code to match existing schema — do not add missing columns via migration
