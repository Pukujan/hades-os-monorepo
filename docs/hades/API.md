# Hades API

## Endpoint quick reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/readiness` | Hades service readiness check |
| GET | `/bootstrap` | Bootstrap data for frontend hydration |
| POST | `/chat` | Send a chat message to Hermes for processing (legacy, context from body) |
| POST | `/chat/general` | Send a general chat message to Hermes (non-forge context) |
| POST | `/chat/forge` | Send a forge chat message to Hermes (minion creation context) |
| POST | `/minions/test` | Run a test of the current minion draft |
| POST | `/minions` | Save a new minion |
| POST | `/assignments` | Assign a minion to a social channel |
| POST | `/triggers` | Handle an incoming social trigger (Discord, Telegram, etc.) |
| POST | `/triggers/telegram/:userId` | Incoming Telegram webhook (called by Telegram servers, no auth) |
| GET | `/conversations/:id/messages` | List messages in a conversation |
| DELETE | `/conversations/:id/messages` | Clear all messages from a conversation |
| GET | `/socials` | List user's social connections (Discord, Telegram) without tokens |
| POST | `/socials/telegram/token` | Save a Telegram bot token (validates via getMe) |
| GET | `/minions` | List all minions for the authenticated user |
| GET | `/minions/:id` | Get a single minion by ID |
| GET | `/minions/:id/logs` | Get execution logs for a minion |
| GET | `/notifications` | List notifications for the authenticated user |
| PATCH | `/minions/:id` | Update a minion's configuration |
| DELETE | `/minions/:id` | Delete a minion |
| POST | `/workflows` | Create a workflow definition |
| GET | `/workflows` | List workflow definitions for the user |
| GET | `/workflows/:id` | Get a workflow definition by ID |
| POST | `/workflows/:id/execute` | Execute a workflow, creating a run and orchestrating tool calls |
| GET | `/workflows/:id/runs` | List runs for a workflow definition |
| PATCH | `/workflows/:id` | Update a workflow definition |
| DELETE | `/workflows/:id` | Delete a workflow definition |
| POST | `/socials/discord/token` | Save a Discord bot token (validates via Discord API) |
| POST | `/socials/github/token` | Save a GitHub personal access token (validates via GitHub API) |
| POST | `/socials/slack/token` | Save a Slack bot token (validates via Slack API) |
| DELETE | `/socials/telegram/token` | Remove a Telegram bot token |
| POST | `/socials/instagram/connect` | Initiate Instagram OAuth connection flow |
| POST | `/socials/instagram/connection` | Save or update Instagram connection credentials |
| DELETE | `/socials/instagram/connection` | Remove an Instagram connection |
| POST | `/triggers/instagram` | Handle an incoming Instagram trigger |
| GET | `/extension/download` | Download the browser extension package |
| POST | `/extension/keys` | Register a new extension API key |
| GET | `/extension/keys` | List extension API keys for the user |
| POST | `/extension/keys/:id/rotate` | Rotate an extension API key |
| POST | `/extension/keys/:id/revoke` | Revoke an extension API key |
| GET | `/extension/workflows` | List workflow definitions for extension client |
| POST | `/extension/chat` | Send a chat message from the extension |
| GET | `/extension/minions` | List minions for the extension client |
| POST | `/extension/minions` | Create a minion from the extension |
| POST | `/extension/documents` | Upload a document from the extension |
| GET | `/extension/documents` | List documents for the extension client |
| POST | `/extension/context-spaces` | Create a context space from the extension |
| GET | `/extension/context-spaces` | List context spaces for the extension client |
| POST | `/extension/page-capture` | Capture a page from the extension |
| GET | `/extension/page-capture` | List page captures for the extension client |
| GET | `/extension/approvals` | List pending approvals for the extension client |
| POST | `/extension/approvals` | Create an approval request from the extension |
| POST | `/extension/approvals/:id/decision` | Approve or reject an approval request |
| GET | `/hermes/status` | Hermes autonomous runtime status |
| POST | `/hermes/tasks` | Create an autonomous Hermes task |
| GET | `/hermes/state` | List Hermes workspace state objects |
| GET | `/hermes/skills` | List Hermes skills |
| POST | `/sessions` | Create a Hermes profile session, returns edge route |
| GET | `/proof/profile` | Admin-only: get detailed profile proof (state, paths, secrets check) |
| POST | `/proof/snapshot` | Admin-only: trigger profile state snapshot and return metadata |
| POST | `/proof/restart` | Admin-only: trigger service restart (Docker proof) |
| POST | `/speak` | Text-to-speech: synthesize speech from text via edge-tts |
| POST | `/transcribe` | Speech-to-text: transcribe audio via Groq Whisper API |
## Endpoint details

### POST /chat/general

Send a general chat message to Hermes. General chat may talk normally, answer questions, and help navigate the app. It must not create/draft/test/save minions.

**Request body:**

```json
{
  "message": "string (required) — the user's message",
  "conversationId": "string (optional) — resume an existing conversation",
  "clientMessageId": "string (optional) — idempotent message identifier",
  "idempotencyKey": "string (optional) — idempotent request key",
  "currentDraft": "object (optional) — current minion draft (unused in general)"
}
```

**Response:**

```json
{
  "conversationId": "string — the conversation id",
  "assistantMessage": {
    "id": "string",
    "role": "assistant",
    "content": "string — the reply text",
    "status": "completed",
    "suggestions": ["string"],
    "actions": [{ "type": "route", "label": "Open Forge", "to": "/app/forge" }]
  },
  "actions": [{"type": "route"}],
  "cards": [{"type": "product_result"}]
}
```

### POST /chat/forge

Send a forge chat message to Hermes. Forge is the only place where minions are created, edited, tested, refined, or saved.

**Request body:**

```json
{
  "message": "string (required) — the user's message",
  "conversationId": "string (optional) — resume an existing forge conversation",
  "clientMessageId": "string (optional)",
  "idempotencyKey": "string (optional)",
  "currentDraft": "object (optional) — current minion draft state"
}
```

**Response:**

```json
{
  "conversationId": "string",
  "assistantMessage": {
    "id": "string",
    "role": "assistant",
    "content": "string",
    "status": "completed",
    "suggestions": ["string"]
  },
  "draft": {"name": "string", "category": "string"},
  "missingFields": ["string"]
}
```

### POST /workflows

Create a new workflow definition.

**Request body:**

```json
{
  "name": "string (required) — workflow name",
  "goal": "string (required) — workflow goal",
  "prompt": "string (optional) — instruction prompt",
  "guardrails": ["string (optional)"],
  "allowedTools": ["string (optional)"],
  "approvalPolicy": {"requireApprovalFor": ["string"]},
  "requiredContext": ["string (optional)"]
}
```

### GET /workflows/:id

Get a workflow definition by ID.

### POST /workflows/:id/execute

Execute a workflow, creating a run and orchestrating tool calls through the Hermes planner.

**Request body:**

```json
{
  "input": {
    "message": "string (optional) — execution input"
  },
  "idempotencyKey": "string (optional)"
}
```

**Response:**

```json
{
  "run": {
    "id": "uuid",
    "status": "running | completed | approval_required | failed",
    "result": {
      "status": "string",
      "toolResults": [{"toolName": "string", "result": {}}],
      "approvalRequests": [{"id": "uuid", "action_type": "string"}],
      "auditEntries": [{"id": "uuid", "toolName": "string", "status": "string"}]
    }
  ]
}
```

### GET /proof/profile

Admin-only proof hook. Requires `Authorization: Bearer <HADES_E2E_AUTH_TOKEN>`.

**Query params:**

```
profileName: string (required) — profile to inspect
```

**Response:**

```json
{
  "profileName": "tenant_a_user_a",
  "hermesApiBaseUrl": "http://localhost:3001/api/hades/hermes/tenant_a_user_a/v1",
  "authMode": "edge_injected",
  "platform": "local",
  "profilesRoot": "/data/hermes/profiles",
  "railwayVolumeMountPath": "",
  "hermesHome": "/data/hermes/profiles/tenant_a_user_a",
  "apiHost": "127.0.0.1",
  "apiPort": 8657,
  "apiServerKeyHash": "sha256:...",
  "directBrowserReachable": false,
  "rawProfilePortPublic": false,
  "state": {
    "hasStateDb": true,
    "hasSessionsDir": true,
    "hasMemoriesDir": true,
    "hasEnvFile": true,
    "envReturned": false
  }
}
```

### POST /proof/snapshot

Admin-only proof hook. Requires `Authorization: Bearer <HADES_E2E_AUTH_TOKEN>`.

**Request body:**

```json
{
  "profileName": "tenant_a_user_a",
  "reason": "final-proof"
}
```

**Response:**

```json
{
  "objectKey": "profiles/tenant_a/users/user_a/tenant_a_user_a/snapshots/snapshot-id.json",
  "visibility": "private",
  "secretStripped": true,
  "includes": ["memories/", "sessions/", "state.db"]
}
```

### POST /proof/restart

Admin-only proof hook. Requires `Authorization: Bearer <HADES_E2E_AUTH_TOKEN>`.

Triggers graceful service restart via `process.exit(0)`. Docker Compose `restart: unless-stopped` policy will restart the container.

**Response:**

```json
{
  "status": "restarting"
}
```

### POST /speak

Text-to-speech endpoint. Synthesizes speech from text using edge-tts CLI.

**Request body:**

```json
{
  "text": "string (required) — the text to synthesize",
  "voice": "string (optional) — edge-tts voice name, defaults to en-US-JennyNeural"
}
```

**Response:**

Returns `audio/mpeg` binary stream on success.

**Status codes:**

| Code | Description |
|------|-------------|
| 200 | Audio file (audio/mpeg) |
| 400 | Missing `text` field |
| 503 | Voice service not configured |

### POST /transcribe

Speech-to-text endpoint. Transcribes audio using Groq Whisper API.

**Request body:**

```json
{
  "audio": "string (required) — base64-encoded audio data"
}
```

**Response:**

```json
{
  "text": "string — transcribed text"
}
```

**Status codes:**

| Code | Description |
|------|-------------|
| 200 | Transcription result |
| 400 | Missing `audio` field |
| 503 | Voice service not configured |

### POST /:profileName/media

Upload a media file to attach to a Hermes conversation. Creates an attachment record, stores the file, and returns a browser-safe Hades media URL plus an agent prompt fragment.

**Request headers:**
```
Authorization: Bearer <supabase-jwt> (for auth context)
x-user-id: string (optional, used when auth context unavailable)
x-tenant-id: string (optional, used when auth context unavailable)
```

**Request body:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | file | The media file (max 50 MB) |
| `purpose` | string | One of: `image`, `video`, `audio`, `document` |

**Allowed MIME types:**

| Category | MIME types |
|----------|------------|
| Image | `image/png`, `image/jpeg`, `image/gif`, `image/webp` |
| Video | `video/mp4`, `video/webm`, `video/x-msvideo` |
| Audio | `audio/wav`, `audio/mpeg`, `audio/ogg`, `audio/webm` |
| Document | `application/pdf`, `text/plain`, `text/csv`, `text/markdown` |

**Response (201):**

```json
{
  "attachment": {
    "id": "uuid",
    "contentType": "string",
    "url": "string — browser-safe Hades media download URL",
    "promptPart": "string — reusable agent prompt fragment",
    "extractedText": "string | null — text content for PDF/txt files"
  }
}
```

**Status codes:**

| Code | Description |
|------|-------------|
| 201 | Upload successful |
| 400 | Missing file, unsupported MIME type, or invalid purpose |
| 403 | Profile ownership mismatch |
| 413 | File exceeds 50 MB limit |

### GET /:profileName/media/:attachmentId

Download (resolve) a previously uploaded media attachment. Authenticated against the profile to enforce cross-profile isolation.

**Request headers:**
```
x-user-id: string (required)
x-tenant-id: string (required)
```

**Response (200):** Binary stream with the attachment's original `content-type`.

**Status codes:**

| Code | Description |
|------|-------------|
| 200 | Binary file stream |
| 403 | Profile ownership mismatch or invalid auth |
| 404 | Attachment not found |

### POST /sessions

Create a new Hermes profile session. Returns a scoped edge route for the Hermes profile API server.

**Request headers:**

```
Authorization: Bearer <supabase-jwt> (optional)
x-user-id: string (optional, used when auth context unavailable)
x-tenant-id: string (optional, used when auth context unavailable)
```

**Response:**

```json
{
  "profileName": "string — tenantId_userId composite",
  "hermesApiBaseUrl": "string — edge route path for profile Hermes API",
  "authMode": "edge_injected",
  "routingToken": null
}
```

### GET /hermes/status

Hermes autonomous runtime status check. Returns mode, config, and runtime counters.

**Response:**

```json
{
  "mode": "string — HERMES_RUNTIME_MODE env var or 'standalone'",
  "hermesHome": "string — configured hermes home path",
  "stateStore": "string — storage mode (memory or supabase)",
  "objectStore": "string — storage mode (memory or supabase)",
  "lastRunAt": "string | null — ISO timestamp of last task run",
  "totalRuns": "number — total task runs since process start"
}
```

### POST /hermes/tasks

Execute an autonomous Hermes task.

**Request body:**

```json
{
  "message": "string (required) — the task prompt"
}
```

**Response:**

```json
{
  "taskId": "string — the generated task ID",
  "routingTokenStatus": "issued",
  "status": "completed",
  "reply": "string — Hermes reply text",
  "assistantText": "string — Hermes assistant reply text"
}
```

### GET /hermes/state

List workspace state objects for the authenticated user.

**Response:**

```json
{
  "objects": [
    {
      "objectKey": "string",
      "contentHash": "string",
      "createdAt": "ISO timestamp",
      "updatedAt": "ISO timestamp"
    }
  ]
}
```

### GET /hermes/skills

List available Hermes skills.

**Response:**

```json
{
  "skills": []
}
```

### GET /workflows/:id/runs

List runs for a workflow definition.

**Response:**

```json
{
  "runs": [
    {
      "id": "uuid",
      "workflow_definition_id": "uuid",
      "status": "running | completed | approval_required | failed",
      "input": {},
      "output": {},
      "created_at": "ISO timestamp"
    }
  ]
}
```
