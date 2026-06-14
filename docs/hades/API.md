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
| GET | `/conversations/:id/messages` | List messages in a conversation |
| DELETE | `/conversations/:id/messages` | Clear all messages from a conversation |
| GET | `/socials` | List user's social connections (Discord, Telegram) without tokens |
| POST | `/socials/telegram/token` | Save a Telegram bot token (validates via getMe) |

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
