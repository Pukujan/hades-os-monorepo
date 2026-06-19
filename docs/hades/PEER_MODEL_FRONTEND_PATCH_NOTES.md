# Peer-Model Frontend Integration — Patch Notes for Next Agent

## Overview

Replaces the old `hermes --oneshot` CLI subprocess chat flow with a persistent per-profile Hermes API server pattern. Each user gets their own profile (config, SOUL.md, env, sessions, memories, skills) and a dedicated Hermes API server on a private loopback port. The edge proxy routes frontend requests to the correct profile and injects the API_SERVER_KEY server-side.

---

## Part 1: What Exists (Backend Infrastructure — Complete)

### New Files Created

| File | Purpose |
|------|---------|
| `backend/src/modules/hades/runtime/hermesProfileRegistry.js` | In-memory map of profiles -> { apiServerKey, apiHost, apiPort, userId, tenantId }. Provides `upsertProfile`, `findProfile`, `getApiServerKey`. |
| `backend/src/modules/hades/runtime/hermesProfileRouter.js` | Converts profileName -> public edge URL (`publicRouteForProfile`) and -> private loopback target (`internalTargetForProfile`). |
| `backend/src/modules/hades/runtime/hermesProfileProvisioner.js` | Creates profile on disk: runs `hermes profile create`, writes `config.yaml`, `.env`, `SOUL.md`, placeholder `state.db`, `sessions/.gitkeep`, `memories/.gitkeep`. Allocates a unique loopback port. Generates API_SERVER_KEY. Uses `try/catch` so existing profiles aren't recreated. |
| `backend/src/modules/hades/runtime/hermesProfileStatePersistence.js` | Snapshots profile state to object store. Uses `readTree` to capture profile home tree. Strips secrets before storing. |
| `backend/src/modules/hades/runtime/hermesProfileSessionBroker.js` | `startSession()`: verifies Supabase JWT, ensures profile exists via provisioner+registry, issues HMAC routing token, returns `{ profileName, hermesApiBaseUrl, authMode, routingToken }`. |
| `backend/src/modules/hades/runtime/hermesEdgeAuthProxy.js` | `forward()`: verifies edge token, strips frontend auth, injects `apiServerKey`, proxies to `127.0.0.1:{port}`. Fallback: returns 200 `{ status: "edge_ready" }` if upstream Hermes isn't running yet. |
| `backend/src/modules/hades/runtime/hermesRoutingToken.js` | HMAC-sha256 stateless tokens. `issueTask()`/`verifyResponse()`. Payload: `{ taskId, userId, tenantId, processId, profileName?, iat }`. |
| `backend/src/modules/hades/runtime/hermesFilesystem.js` | Added `readTree()` (recursive dir walk, no infinite loop on `.`) and `writeTree()`. |
| `backend/src/modules/hades/runtime/hermesObjectStore.js` | Added `putJson()` and `getJson()`. |

### New Routes (in hermes.routes.js)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/sessions` | Bootstrap a session. Verifies JWT (or anonymous fallback), ensures profile, returns edge URL + routing token. |
| GET | `/proof/profile?profileName=` | Admin proof: returns profile metadata, home path, port, secrets hash, state db/sessions/memories existence. Auth: `Authorization: Bearer <HADES_E2E_AUTH_TOKEN>`. |
| POST | `/proof/snapshot` | Admin proof: triggers profile state snapshot to persistent storage, returns object key + visibility + includes list. |
| POST | `/proof/restart` | Admin proof: calls `process.exit(0)` for Docker restart test. |
| GET | `/:profileName/v1/*` | Edge proxy catch-all: validates routing token, proxies to `127.0.0.1:{port}/v1/*`. |
| POST | `/:profileName/v1/*` | Edge proxy catch-all (same, for POST). |
| GET | `/state-index` | Lists state index markers from `/data/hermes/state-index/` (persistent, survives restart). |
| POST | `/state-index` | Stores a state index marker as JSON file on persistent volume. |

### Changed Files

| File | Change |
|------|--------|
| `backend/src/modules/hades/index.js` | Wires all 6 new runtime modules + proof deps into the hermes router. Passes `profileProvisioner` to routes. Edge auth proxy injected with `verifyEdgeRequest` function. |
| `backend/src/modules/hades/hermes.routes.js` | Added `/sessions`, `/proof/*`, `/state-index`, `/:profileName/v1/*` edge proxy routes. |
| `docker-compose.yaml` | Changed `HERMES_PUBLIC_BASE_URL` to `http://lvh.me:3001/api/hades/hermes`. |
| `backend/.env.docker` | Same URL change. lvh.me resolves to 127.0.0.1 via public DNS — no hosts file needed. |

### Hermes Docs Cache

| Location | Contents |
|----------|----------|
| `docs/hermes-agent/` | 171 pages split from upstream `llms-full.txt`. Organized by topic: `user-guide/profiles.md`, `features/api-server.md`, `features/gateway.md`, `features/web-dashboard.md`, `reference/profile-commands.md`, `user-guide/configuration.md`, `features/personality.md`, etc. |

### Test Suite

| Test | Status |
|------|--------|
| `scripts/hades-hermes-peer-docker-proof.e2e.test.mjs` (5 tests) | All pass with `HADES_HERMES_PEER_PROOF_E2E=1` |
| Test 1: session bootstrap | Returns edge URL without localhost/127.0.0.1 |
| Test 2: profile home | Has state.db, sessions/, memories/, .env |
| Test 3: edge route | Edge proxy returns fallback 200 when Hermes not running |
| Test 4: profile snapshot | Strips secrets, includes state files |
| Test 5: restart proof | Profile + state-index survive container restart |

---

## Part 2: Authentication & Isolation Model

### Flow

```
Step 1: GET SESSION
  Frontend (Supabase JWT) → POST /api/hades/hermes/sessions
    → verifySupabaseJwt(jwt) → { userId, tenantId }
      (falls back to anonymous if no JWT or no Supabase configured)
    → profileProvisioner.ensureProfile({ userId, tenantId })
      (creates on first call, no-op on subsequent)
    → profileRegistry.upsertProfile(...)
    → routingToken.issueTask({ userId, tenantId, profileName })
    → returns { profileName, hermesApiBaseUrl, authMode: "edge_injected", routingToken }

Step 2: CHAT
  Frontend (routingToken) → POST {hermesApiBaseUrl}/v1/chat/completions
    → edge proxy: verifyEdgeRequest(headers, profileName)
    → edge proxy strips frontend auth header
    → edge proxy injects "Bearer {apiServerKey}"
    → forwards to http://127.0.0.1:{profilePort}/v1/chat/completions
```

### Isolation Layers

| Layer | Mechanism | Status |
|-------|-----------|--------|
| Profile isolation | Each `userId:tenantId` has own HERMES_HOME, loopback port | ✓ |
| Routing token | HMAC-sha256, contains `{ taskId, userId, tenantId, profileName, iat }` | ✓ |
| API server key | Generated per profile, injected server-side, never to browser | ✓ |
| Social tokens (Telegram/Discord/GitHub) | Encrypted in DB via Hades social routes — NOT in profile `.env` | ✓ |
| Edge token verification | Currently checks `HADES_E2E_AUTH_TOKEN` shared secret (proof mode) | ⚠️ GAP |

### The Critical Auth Gap

`verifyEdgeRequest` at `backend/src/modules/hades/index.js:356-363`:

```js
verifyEdgeRequest: async ({ headers, profileName }) => {
  const proofToken = process.env.HADES_E2E_AUTH_TOKEN;
  const auth = headers?.authorization || "";
  if (proofToken && auth !== `Bearer ${proofToken}`) {
    throw Object.assign(new Error("unauthorized"), { status: 401 });
  }
  return { userId: "edge-user", tenantId: "edge-tenant", profileName };
},
```

This currently **only checks a shared proof token**. It does NOT:
- Decode/validate the HMAC routing token
- Confirm the userId/tenantId in the token match the profileName
- Reject requests where token's userId doesn't own the targeted profile

### What the Edge Proxy Auth Must Do in Production

1. Extract `Authorization: Bearer <routingToken>` from incoming request
2. Call `routingToken.verifyResponse({ routingToken })` to decode + validate HMAC signature
3. Extract `userId`, `tenantId`, `profileName` from decoded token payload
4. Confirm `headers.profileName` matches token's `profileName`
5. Look up profile via `profileRegistry.findProfile({ profileName })` to confirm it exists
6. Return `{ userId, tenantId, profileName }` for downstream use
7. On any mismatch, return 401

---

## Part 3: Frontend Gaps — What's Needed

### Gap 1: Swap Chat API Calls

**Current frontend:** `hadesApi.js` calls:
- `POST /api/hades/chat/general`
- `POST /api/hades/chat/forge`
- `POST /api/hades/extension/chat`

**Target frontend:** New flow per chat message:
1. `POST /api/hades/hermes/sessions` → `{ profileName, hermesApiBaseUrl, routingToken }`
2. `POST {hermesApiBaseUrl}/v1/chat/completions` with OpenAI format:
   ```json
   {
     "model": "hermes-agent",
     "messages": [
       {"role": "system", "content": "..."},
       {"role": "user", "content": "Hello"}
     ],
     "stream": false
   }
   ```
   Header: `Authorization: Bearer <routingToken>`

Caching: the session response can be cached per userId — it doesn't change between requests. Only re-call `/sessions` if the routing token expires.

### Gap 2: Profile Settings Page

No backend routes exist yet for profile management. Need:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/hades/hermes/profile/{name}` | Read profile metadata, config.yaml contents |
| GET | `/api/hades/hermes/profile/{name}/soul` | Read SOUL.md content |
| PUT | `/api/hades/hermes/profile/{name}/soul` | Write SOUL.md (new personality) |
| PUT | `/api/hades/hermes/profile/{name}/env` | Write .env (API keys, bot tokens) |
| PUT | `/api/hades/hermes/profile/{name}/config` | Write config.yaml (model, provider, settings) |
| GET | `/api/hades/hermes/profile/{name}/sessions` | List session history |
| GET | `/api/hades/hermes/profile/{name}/memories` | List stored memories |
| DELETE | `/api/hades/hermes/profile/{name}` | Delete profile |

The Hermes web dashboard (`hermes dashboard` at localhost:9119) already has this — but it's a separate Hermes-built UI. Our frontend needs its own profile management page.

### Gap 3: Frontend Profile Page UI

A new React page/module in `frontend/src/modules/hades/pages/`:

- **Profile status card**: model, provider, profile name, gateway status
- **Personality editor**: textarea for SOUL.md content (markdown)
- **API keys section**: model provider keys (OpenRouter, etc.), social bot tokens
- **Model picker**: dropdown of available models
- **Session history**: list of recent sessions with timestamps
- **Skills list**: read-only display of installed skills

---

## Part 4: What the Old Chat Flow Does (Reference)

Just because the old `hermesRuntime.service.js` spawns Hermes as a one-shot subprocess:

```
Frontend message → Express route → hades.service.js chat()
  → hermesRuntime.buildResponse()
    → hermesRuntime.generateDraft()
      → execFileAsync("hermes", ["--oneshot", prompt, "--provider", "openrouter", "--model", "deepseek/deepseek-v4-flash"])
      → parses JSON from stdout → returns { reply, actions, sessionId }
  → saves user message + assistant response to DB
  → returns assistantMessage to frontend
```

The old routes (`/chat/general`, `/chat/forge`, `/extension/chat`) can be kept as a fallback or removed once the peer-model flow is stable in the frontend.

---

## Part 5: Backend Gaps Remaining

### Gap A: Profile Hermes API Server Not Launched

The provisioner creates profile files on disk but does NOT start the Hermes gateway/API server process. The profile has no running Hermes — the edge proxy returns `{ status: "edge_ready" }` fallback when forwarding requests.

Need: A profile lifecycle manager that:
- After `ensureProfile()`, spawns `hermes -p {profileName} gateway` as a child process
- Tracks PID per profile
- Restarts on crash
- Stops on profile delete
- Passes `API_SERVER_KEY` env var to the subprocess
- Binds the gateway to the allocated loopback port

### Gap B: Production Edge Auth (See Part 2)

Replace the `HADES_E2E_AUTH_TOKEN` proof check with proper HMAC routing token validation.

### Gap C: Profile Management Routes (See Gap 2)

No GET/PUT for soul, config, env, sessions, memories.

### Gap D: Social Token Sync

Social tokens (Telegram, Discord, etc.) are stored in DB via Hades social routes. The profile's `.env` does NOT contain them. If a user wants the Hermes gateway to use a bot token, it needs to either:
- Be written to the profile's `.env` (requires PUT /profile/{name}/env route)
- Or the Hermes gateway needs to be configured to use the Hades-managed token pool

Current architecture keeps them separate: Hades social layer handles inbound messages, Hermes profiles handle outbound conversations. Decide which direction.

---

## Part 6: Sequence to Ship

```
Priority 1 — Make chat work end-to-end:
  [Backend] Gap A: Launch Hermes API server per profile
  [Backend] Gap B: Fix edge auth to validate routing tokens properly
  [Frontend] Gap 1: Swap chat API calls to session → edge URL flow
  → Chat works end-to-end through persistent profile API server

Priority 2 — Profile management:
  [Backend] Gap C: Add profile management routes (soul, config, env, sessions)
  [Frontend] Gap 2 + 3: Profile settings page with SOUL editor, model picker, API keys

Priority 3 — Polish:
  [Backend] Gap D: Social token sync decision
  [Frontend] Remove old /chat/general flow, harden error handling
  [Backend] Delete proof hooks (they're for Docker proof only)
  [Docs] Update API.md with new routes
```
