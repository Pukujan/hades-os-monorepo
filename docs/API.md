# API registry (starter)

## Endpoint registry

| Method | Path | Module | Description |
|--------|------|--------|-------------|
| GET | `/api/auth/browser-config` | auth | Public auth config for frontend (Supabase URL, anon key, app URL) |
| GET | `/api/hades/readiness` | hades | Hades service readiness check |
| GET | `/api/hades/bootstrap` | hades | Bootstrap data for frontend hydration |
| POST | `/api/hades/chat` | hades | Send a chat message to Hermes (legacy, context from body) |
| POST | `/api/hades/chat/general` | hades | Send a general chat message to Hermes (non-forge context) |
| POST | `/api/hades/chat/forge` | hades | Send a forge chat message to Hermes (minion creation context) |
| POST | `/api/hades/minions/test` | hades | Run a test of the current minion draft |
| POST | `/api/hades/minions` | hades | Save a new minion |
| POST | `/api/hades/assignments` | hades | Assign a minion to a social channel |
| POST | `/api/hades/triggers` | hades | Handle an incoming social trigger (Discord, Telegram) |
| GET | `/api/hades/conversations/:id/messages` | hades | List messages in a conversation |
| DELETE | `/api/hades/conversations/:id/messages` | hades | Clear all messages from a conversation |
| GET | `/api/hades/socials` | hades | List user's social connections (Discord, Telegram) without tokens |
| POST | `/api/hades/socials/telegram/token` | hades | Save a Telegram bot token (validates via getMe) |
| GET | `/api/_reference/health` | _reference | Example module health check |
| GET | `/api/model-condenser/health` | model-condenser | Module health and config summary |
| POST | `/api/model-condenser/condense` | model-condenser | Regenerate consolidated-models.json |
| GET | `/api/model-condenser/consolidated` | model-condenser | Read consolidated schema inventory |
