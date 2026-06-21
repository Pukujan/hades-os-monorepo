# CODE_IMPLEMENTATION.md - Hades OS Implementation Rules

Version: 1.1.0
Last updated: 2026-06-20
Applies to: Supabase auth/db, Vercel frontend, Railway Hades backend, Hermes runtime/profile gateway, social OAuth/webhooks, media/STT/TTS routing
Requires: AGENTS.md integration rules

This file contains stack-specific patterns. It does not replace AGENTS.md. Read this file before writing integration code for auth, proxying, database, Hermes profile/session handling, OAuth, media, deployed services, or cross-service routing.

---

## 1. Topology

```txt
Browser
  | Supabase JS client for auth and RLS-scoped direct reads
  v
Vercel frontend
  | sends Supabase JWT in Authorization header
  v
Railway: Hades backend
  | verifies Supabase JWT
  | holds per-profile Hermes API_SERVER_KEY server-side
  | resolves profile route metadata
  | forwards chat/session calls to Hermes as a thin proxy
  | owns CRUD for integration tokens that are not Hermes-native session state
  v
Railway: Hermes runtime / profile gateway
  | one profile home per user/profile
  | one API_SERVER_PORT and API_SERVER_KEY per profile
  | owns conversation/session chaining, tools, memory files, gateway state
  v
Social platforms / model providers / media services

Supabase Postgres/Auth is reachable by Vercel with anon/RLS client behavior and by Hades with server-only service-role behavior.
```

Three distinct auth boundaries exist. Treat them as separate problems.

| Boundary | Path | Token type | Common failure mode |
|---|---|---|---|
| A | Browser to Hades | Supabase JWT | Works locally, fails hosted due CORS/domain/JWT config |
| B | Hades to Hermes | Static per-profile `API_SERVER_KEY` | Works locally, fails hosted due localhost/private network/profile registry mismatch |
| C | Hermes to social platform | Provider OAuth/webhook token | Works in dev tunnel, fails hosted due redirect URI/webhook/token lifecycle mismatch |

---

## 2. Boundary A - Browser to Hades

- Frontend sends `Authorization: Bearer <Supabase JWT>` to Hades.
- Hades validates with Supabase server SDK or a confirmed existing JWT helper. Do not hand-roll JWT verification.
- Hades CORS must allow exact deployed Vercel domains, including preview domains only when intentionally supported.
- Never put Supabase service role keys in frontend code, Vercel client env, browser logs, or browser network responses.

Hosted verification gate:

```txt
Use a real Supabase-issued JWT from a real signed-in browser session.
Send it to the real Railway Hades URL.
Confirm Hades accepts valid auth and rejects missing/invalid auth.
Confirm browser CORS succeeds from the deployed Vercel domain.
```

---

## 3. Boundary B - Hades to Hermes

Confirmed from local Hermes docs cache under `docs/hermes-agent/`:

- `API_SERVER_KEY` is a static bearer token per profile, stored in that profile's `.env`.
- The key grants powerful Hermes API/tool access. Treat it like a service-role secret.
- `API_SERVER_HOST` defaults to `127.0.0.1`.
- Per-profile ports/keys are the documented multi-profile pattern.
- `SOUL.md` is loaded only from the profile's `HERMES_HOME`; if missing, empty, or unreadable, Hermes falls back to the built-in Hermes identity.
- `terminal.home_mode: profile` is required for strict per-profile CLI/home isolation in deployed profile runtimes.

Decision: backend-mediated chat path.

The browser must not call Hermes directly with `API_SERVER_KEY`. Hades should be a thin proxy: verify Supabase JWT, resolve the user's profile, inject the per-profile `API_SERVER_KEY` server-side, forward the request, and stream/pass the Hermes response back without reimplementing Hermes session behavior.

Hades legitimately owns:

```txt
Supabase JWT verification
profile resolution and profile registry
server-side API_SERVER_KEY custody
profile process/gateway startup checks
CRUD for unrelated integration tokens
thin edge proxying
```

Hades should not own:

```txt
Hermes conversation history assembly
Hermes session routing logic
Hermes memory chaining
OAuth behavior that Hermes connector already owns
retry queues or tool semantics Hermes already provides
```

Hosted verification gate:

```txt
Confirm deployed Hades reaches deployed Hermes/profile gateway over the actual Railway networking path.
Confirm deployed Hades has the same API_SERVER_KEY that the target Hermes profile expects.
Confirm profile registry resolves the correct API_SERVER_PORT and API_SERVER_KEY for the signed-in user.
Confirm API_SERVER_KEY never appears in frontend bundles, browser network tab, or client logs.
Confirm SOUL.md exists in the actual profile home and contains Hades identity before chat.
Run full browser -> Vercel -> Railway Hades -> Hermes profile -> browser response path live.
```

---

## 4. Hermes-Native Sessions - Delegate, Do Not Reimplement

Hermes natively supports:

```txt
conversation parameter on /v1/chat/completions and /v1/responses
previous_response_id explicit chaining
Sessions REST API under /api/sessions/*
X-Hermes-Session-Key for stable per-user/per-channel memory scoping
profile-scoped memory, sessions, state.db, skills, logs, SOUL.md, config.yaml, .env
```

Audit trigger: if Hades or frontend code manually rebuilds transcript history, mirrors Hermes sessions in a custom table, or derives routing that Hermes already exposes, treat it as a legacy reimplementation candidate.

Preferred pattern:

```txt
Frontend keeps stable conversation/session ids only as client state.
Hades forwards them to Hermes.
Hermes owns chaining/history/memory.
Hades stores only what is needed for auth, profile resolution, audit, and UI affordances.
```

---

## 5. Boundary C - Social OAuth and Webhooks

- Use Hermes connectors when Hermes already supports the provider.
- Do not write a parallel OAuth client unless a confirmed Hermes gap exists.
- `redirect_uri` must match provider console config exactly: scheme, host, path, and trailing slash.
- Vercel previews usually cannot complete real OAuth because most providers do not allow wildcard redirect URIs.
- Token lifecycle is provider-specific. Confirm refresh/expiry behavior from Hermes connector docs/source or provider docs.
- Webhooks require hosted verification. A local tunnel test is not enough for production readiness.

Hosted verification gate:

```txt
Diff redirect URI literally against provider console.
Confirm the tested environment is staging/prod, not an unsupported preview URL.
Confirm token storage/refresh matches provider lifecycle.
Confirm webhook endpoint is publicly reachable and raw-payload diagnostics exist.
```

---

## 6. Env Var Parity

Maintain service env examples as source of truth. Before deploys touching auth/proxy/OAuth/profile/media:

```txt
Diff local .env/.env.example against Railway variables.
Diff frontend .env/.env.example against Vercel variables.
Confirm runtime vars are available where code reads them.
Confirm build-time frontend vars are intentionally public.
```

Common critical vars:

```txt
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ENCRYPTION_KEY
OPENROUTER_API_KEY
OPENROUTER_MODEL
GROQ_API_KEY
HERMES_HOME
HERMES_PROFILES_ROOT
HERMES_PUBLIC_BASE_URL
HERMES_BIN_PATH
HADES_E2E_AUTH_TOKEN
VITE_API_BASE_URL
```

Never invent a secret value. Report the missing variable name.

---

## 7. Supabase and Persistence

Server-only Hades code may use Supabase service-role access, but must still enforce ownership in application logic before returning user data.

Before schema changes:

```txt
Inspect existing migrations and repository patterns.
Add a migration file.
Add tests proving row shape, ownership behavior, secret stripping, and error handling.
Note whether generated DB types need regeneration.
```

Token and profile secrets:

```txt
Store only encrypted token/key material.
Use the existing token crypto pattern when possible.
Never return raw secrets from public route JSON.
Expose secret hashes only when the UI or diagnostics need proof-of-presence.
Decrypt only inside server-side runtime paths that must call the provider/Hermes.
```

---

## 8. Media, Voice, OCR, and Files

Default direction:

```txt
STT: Groq Whisper or a confirmed cheaper compatible STT provider, called server-side.
TTS: edge-tts CLI/server-side synthesis unless replaced by a confirmed provider.
Vision/OCR: route through a configured vision-capable model/provider; prefer cheaper accurate models only after checking current provider docs/pricing.
Files: upload to Hades/profile-scoped storage, pass references or extracted text to Hermes, do not leak cross-user files.
```

For uploads:

```txt
Validate MIME and extension.
Enforce size limits.
Store under the authenticated user's/profile's namespace.
Block path traversal.
Return attachment metadata, not arbitrary filesystem paths unless that path is meant for the agent runtime only.
Add E2E coverage using persistent test fixtures for audio, image, video, and PDF when the feature supports them.
```

---

## 9. Frontend Routing Rules

- Browser-to-Hades calls must use the shared API base helper, not hardcoded same-origin paths, unless the route is intentionally same-origin.
- Vercel frontend should route Hades API calls to Railway via configured `VITE_API_BASE_URL` or equivalent.
- Do not restore silent legacy chat fallback. If Hermes is unavailable, show an explicit Hades/Hermes unavailable message.
- Do not expose `API_SERVER_KEY` or service-role secrets in frontend code.
- Chat UI copy should say Hades when the product identity is Hades, even if the underlying runtime is Hermes.

---

## 10. Legacy Express Route Policy

Existing Express routes are not automatically authoritative. If a route predates the current Hermes-native architecture, compare it against Hermes docs and `CODE_IMPLEMENTATION.md` before building on it.

Likely legacy/reimplementation candidates:

```txt
custom Hades task execution routes that duplicate Hermes tools/sessions
manual transcript assembly for Hermes conversations
old Hades chat fallback routes used after Hermes errors
profile/session mirrors that do not add auth, audit, or routing value
```

Prefer a thin Hermes-native path unless the user explicitly asks for a minimal compatibility patch.

---

## 11. Phase Tags and Verification

Tag phases when they touch these boundaries:

| Tag | Use when |
|---|---|
| `auth` | Supabase JWT, API_SERVER_KEY, service-role, token custody |
| `proxy` | Hades to Hermes routing, edge proxy, CORS, private networking |
| `oauth` | Provider login, token refresh, social connector auth |
| `cross-service` | Any Vercel + Railway + Supabase + Hermes request path |
| `media` | Uploads, STT, TTS, OCR, video/image/document processing |

If a phase has `auth`, `proxy`, `oauth`, or `cross-service`, it requires hosted verification before being called done. If hosted verification cannot be run, the handoff must say so and give exact commands or manual steps.

---

## 12. Recommended Handoff Checklist

```txt
Context packet summary:
Evidence log:
Hermes docs read, if Hermes-related:
External signatures confirmed:
Schema/migrations checked:
Implementation summary:
Files changed:
Tests added/updated:
Local verification:
Hosted verification:
Secrets exposure check:
Reimplementation check:
Remaining risks:
Suggested next step:
```