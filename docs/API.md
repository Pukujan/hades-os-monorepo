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
| POST | `/api/hades/triggers/telegram/:userId` | hades | Incoming Telegram webhook (called by Telegram servers, no auth) |
| GET | `/api/hades/conversations/:id/messages` | hades | List messages in a conversation |
| DELETE | `/api/hades/conversations/:id/messages` | hades | Clear all messages from a conversation |
| GET | `/api/hades/socials` | hades | List user's social connections (Discord, Telegram) without tokens |
| POST | `/api/hades/socials/telegram/token` | hades | Save a Telegram bot token (validates via getMe) |
| GET | `/api/hades/minions` | hades | List all minions for the authenticated user |
| GET | `/api/hades/minions/:id` | hades | Get a single minion by ID |
| GET | `/api/hades/minions/:id/logs` | hades | Get execution logs for a minion |
| PATCH | `/api/hades/workflows/:id` | hades | Update a workflow definition |
| DELETE | `/api/hades/workflows/:id` | hades | Delete a workflow definition |
| DELETE | `/api/hades/socials/telegram/token` | hades | Remove a Telegram bot token |
| DELETE | `/api/hades/socials/instagram/connection` | hades | Remove an Instagram connection |
| POST | `/api/hades/socials/discord/token` | hades | Save a Discord bot token (validates via Discord API) |
| POST | `/api/hades/socials/github/token` | hades | Save a GitHub personal access token (validates via GitHub API) |
| POST | `/api/hades/socials/slack/token` | hades | Save a Slack bot token (validates via Slack API) |
| POST | `/api/hades/socials/instagram/connect` | hades | Initiate Instagram OAuth connection flow |
| POST | `/api/hades/socials/instagram/connection` | hades | Save or update Instagram connection credentials |
| POST | `/api/hades/triggers/instagram` | hades | Handle an incoming Instagram trigger |
| GET | `/api/hades/extension/download` | hades | Download the browser extension package |
| POST | `/api/hades/extension/keys` | hades | Register a new extension API key |
| GET | `/api/hades/extension/keys` | hades | List extension API keys for the user |
| POST | `/api/hades/extension/keys/:id/rotate` | hades | Rotate an extension API key |
| POST | `/api/hades/extension/keys/:id/revoke` | hades | Revoke an extension API key |
| GET | `/api/hades/extension/workflows` | hades | List workflow definitions for extension client |
| POST | `/api/hades/extension/chat` | hades | Send a chat message from the extension |
| GET | `/api/hades/extension/minions` | hades | List minions for the extension client |
| POST | `/api/hades/extension/minions` | hades | Create a minion from the extension |
| POST | `/api/hades/extension/documents` | hades | Upload a document from the extension |
| GET | `/api/hades/extension/documents` | hades | List documents for the extension client |
| POST | `/api/hades/extension/context-spaces` | hades | Create a context space from the extension |
| GET | `/api/hades/extension/context-spaces` | hades | List context spaces for the extension client |
| POST | `/api/hades/extension/page-capture` | hades | Capture a page from the extension |
| GET | `/api/hades/extension/page-capture` | hades | List page captures for the extension client |
| GET | `/api/hades/extension/approvals` | hades | List pending approvals for the extension client |
| POST | `/api/hades/extension/approvals` | hades | Create an approval request from the extension |
| POST | `/api/hades/extension/approvals/:id/decision` | hades | Approve or reject an approval request |
| GET | `/api/hades/notifications` | hades | List notifications for the authenticated user |
| PATCH | `/api/hades/minions/:id` | hades | Update a minion's configuration |
| DELETE | `/api/hades/minions/:id` | hades | Delete a minion |
| POST | `/api/hades/workflows` | hades | Create a workflow definition |
| GET | `/api/hades/workflows` | hades | List workflow definitions for the user |
| GET | `/api/hades/workflows/:id` | hades | Get a workflow definition by ID |
| POST | `/api/hades/workflows/:id/execute` | hades | Execute a workflow, creating a run and orchestrating tool calls |
| GET | `/api/hades/workflows/:id/runs` | hades | List runs for a workflow definition |
| GET | `/api/_reference/health` | _reference | Example module health check |
| GET | `/api/model-condenser/health` | model-condenser | Module health and config summary |
| POST | `/api/model-condenser/condense` | model-condenser | Regenerate consolidated-models.json |
| GET | `/api/model-condenser/consolidated` | model-condenser | Read consolidated schema inventory |
| POST | `/api/hades/sessions` | hades | Create a Hermes profile session, returns edge route |
| GET | `/api/hades/proof/profile` | hades | Admin-only: get detailed profile proof (state, paths, secrets check) |
| POST | `/api/hades/proof/snapshot` | hades | Admin-only: trigger profile state snapshot and return metadata |
| POST | `/api/hades/proof/restart` | hades | Admin-only: trigger service restart (Docker proof) |
| GET | `/api/hades/state` | hades | List Hermes workspace state objects |
| POST | `/api/hades/speak` | hades | Text-to-speech: synthesize speech from text via edge-tts |
| POST | `/api/hades/transcribe` | hades | Speech-to-text: transcribe audio via Groq Whisper API |
