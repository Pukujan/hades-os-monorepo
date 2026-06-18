# Hermes Agent Context For Hades Development

Use this file when working on Hades/Hermes integration.

## Local Upstream Docs Cache

Official Hermes docs are vendored for future coding agents here:

- `docs/hermes/upstream/llms.txt` - compact official docs index.
- `docs/hermes/upstream/llms-full.txt` - full official docs corpus.
- `docs/hermes/upstream/hermes-docs.agent.json` - machine-readable index plus Hades integration notes.

The official docs advertise these machine-readable sources at:

- `https://hermes-agent.nousresearch.com/docs/llms.txt`
- `https://hermes-agent.nousresearch.com/docs/llms-full.txt`

## Hades Integration Stance

Do not make Hades manually model every Hermes skill or tool.

Prefer this model:

- Hermes runs inside a user-scoped `HERMES_HOME`.
- Hades owns auth, tenant isolation, task routing, approval, audit, and artifact publication.
- Hermes gets a capability envelope, not every integration token by default.
- Hades intercepts boundary-crossing actions such as sending messages, publishing, submitting forms, deleting data, or spending money.
- Hermes responses should carry Hades-issued `taskId` and signed/encrypted routing tokens; do not trust Hermes-authored `userId` as authority.

## High-Value Docs To Read First

- Messaging gateway and platform docs for Telegram/Discord behavior.
- Memory, context files, profiles, and `SOUL.md` docs for per-user isolation.
- Tools, toolsets, MCP, plugins, and skills docs for capability envelopes.
- Security docs for command approval, authorization, and container isolation.
- Gateway internals and agent loop docs before changing process architecture.

## Telegram GIF Implication

Hermes already has messaging-platform capabilities, but in Hades production the safest default is still:

1. Hermes proposes or creates a GIF/media artifact.
2. Hades verifies route, user, tenant, chat, and permission.
3. Hades sends via the correct user's Telegram connection.

Direct Hermes gateway delivery can be explored later, but only inside a user-scoped Hermes profile/home with user-scoped secrets.
