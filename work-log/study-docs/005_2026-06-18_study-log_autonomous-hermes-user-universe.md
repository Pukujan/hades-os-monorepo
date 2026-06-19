# Autonomous Hermes User Universe Study Log

**Date:** 2026-06-18
**Topic:** Revamping Hades/Hermes architecture after comparing current code to official Hermes docs
**Related plan:** `work-log/planning/011_2026-06-18_autonomous-hermes-runtime/plan-log.md`
**Docs cache:** `docs/hermes/upstream/llms-full.txt`, `docs/hermes/upstream/hermes-docs.agent.json`, `docs/hermes/AGENT_CONTEXT.md`

## User Intent

The user does not want Hades to shrink Hermes into a small manually modeled action router. Hermes already supports many higher-level capabilities: messaging platforms, skills, toolsets, MCP, plugins, media tools, memory, sessions, cron, and gateway processes. Hades should not need to hand-code every future capability such as GIF sending, video generation, music creation, voice, or large artifact workflows.

The desired direction is:

- Hermes keeps broad autonomy.
- Hades isolates each user's Hermes world.
- Hades owns identity, tenant scope, routing, approvals, audit, and publication boundaries.
- Bulky Hermes memory/state/artifacts should not live only in Supabase because Supabase storage/database limits are a poor fit for long-running agent state.
- R2 or similar object storage should hold large per-user Hermes state snapshots, memories, skills, sessions, generated media, and artifacts.

## Current Hades Architecture

Current backend behavior:

- `hermesRuntime.service.js` invokes Hermes as a subprocess and parses JSON.
- `HERMES_HOME` and `HERMES_CACHE_DIR` exist but currently default to a shared temp workspace.
- Telegram and Discord delivery are mostly Hades-owned structured actions.
- Hades already has user/tenant scoping, Supabase auth, social connection repositories, and approval-oriented workflow planning.
- Revised red contracts now cover workspace isolation, R2-backed state persistence, Supabase metadata indexing, signed routing, capability envelopes, process manager behavior, boundary actions, Telegram media delivery, and E2E smoke.

Current limitation:

```text
Hades asks Hermes for narrow JSON -> Hades executes known action types
```

That is safe for `send_message` and `send_gif`, but too narrow for native Hermes skills, media generation, gateway features, cron, plugins, MCP, and large artifacts.

## Official Hermes Docs Signals

The upstream docs describe Hermes as a terminal-native autonomous agent with:

- persistent memory and sessions
- agent-created `SKILL.md` skills
- `HERMES_HOME` as the state root
- `SOUL.md`, `USER.md`, `MEMORY.md`, context files, sessions, logs, caches, and plugin directories
- messaging gateway support for Telegram, Discord, Slack, WhatsApp, Signal, SMS, Email, Matrix, Teams, and more
- toolsets, MCP servers, plugins, cron, code execution, voice, image generation, TTS, and browser tooling
- security guidance around authorization, approval, container isolation, and managed deployments
- docs for gateway internals, prompt assembly, session storage, provider runtime, adding tools, and creating skills

Architecture implication:

```text
Hermes is already a broad agent runtime.
Hades should isolate and govern it, not reimplement its whole tool system.
```

## Revised Core Model

Old target:

```text
Hades validates every Hermes tool call and maps it to known adapters.
```

Revised target:

```text
Hades creates a user-scoped Hermes universe.
Hermes works broadly inside that universe.
Hades verifies routing and intercepts boundary-crossing actions.
```

Hades responsibilities:

- authenticate user and tenant
- create scoped `HERMES_HOME`
- seed `SOUL.md`, `USER.md`, `MEMORY.md`, and capability context
- provide only user-scoped secrets/capabilities
- issue signed/encrypted routing tokens per task
- verify every response against task/process identity
- persist/index state
- require approval for boundary actions
- publish/send/submit only after policy checks

Hermes responsibilities:

- reason and plan
- use native tools, skills, MCP, plugins, media tools, and local workspace files
- create or update skills
- create artifacts
- return task-correlated results, artifacts, and proposed boundary actions

## Storage Model: R2 Plus Supabase Index

Supabase should not be the primary storage for all Hermes state. It is better as a metadata and auth index.

Recommended split:

Supabase:

- users, tenants, auth links
- Hermes runtime metadata
- task records and routing token metadata
- R2 object keys and hashes
- skill indexes and current version pointers
- run summaries
- approval records
- audit rows
- small searchable summaries

R2:

- per-user `HERMES_HOME` snapshots
- `MEMORY.md`, `USER.md`, `SOUL.md` versions
- skill directories and `SKILL.md` versions
- session exports and SQLite backups if needed
- logs after redaction
- generated media, videos, audio, images, PDFs, and other artifacts
- large context bundles and document-derived files

Possible object key shape:

```text
tenants/{tenantId}/users/{userId}/hermes/home/{snapshotId}.tar.zst
tenants/{tenantId}/users/{userId}/hermes/memory/MEMORY.md
tenants/{tenantId}/users/{userId}/hermes/user/USER.md
tenants/{tenantId}/users/{userId}/hermes/soul/SOUL.md
tenants/{tenantId}/users/{userId}/hermes/skills/{skillId}/{version}/SKILL.md
tenants/{tenantId}/users/{userId}/hermes/artifacts/{runId}/{artifactName}
tenants/{tenantId}/users/{userId}/hermes/sessions/{sessionId}.json
```

R2 persistence strategy:

- hydrate latest selected objects into `HERMES_HOME` before runtime start
- sync changed files back after task completion or on debounce
- write large artifacts directly to R2
- store content hashes and object keys in Supabase
- avoid storing raw provider keys in R2 snapshots unless encrypted

## Routing And Trust

Do not trust a Hermes-authored `userId` as authority.

Use:

- Hades-owned task registry
- process handle bound to `{userId, tenantId}`
- `taskId`
- signed or encrypted `routingToken`
- response verification before routing or executing actions

Task shape:

```json
{
  "taskId": "task_123",
  "routingToken": "hades-issued-token",
  "capabilities": ["artifact.create", "media.generate", "telegram.propose_send"],
  "input": { "message": "send a cat gif" }
}
```

Response shape:

```json
{
  "taskId": "task_123",
  "routingToken": "hades-issued-token",
  "reply": "I made a GIF draft.",
  "artifacts": [{ "type": "image/gif", "objectKey": "..." }],
  "proposedActions": [
    {
      "type": "telegram.send_animation",
      "requiresApproval": false,
      "mediaObjectKey": "...",
      "caption": "Here is one."
    }
  ]
}
```

Hades verifies:

- token signature/decryption
- task exists
- task belongs to process user/tenant
- action capability is allowed
- approval policy is satisfied
- destination chat/channel belongs to the authenticated user context

## Capability Envelope

Hades should grant broad categories rather than hand-code every internal tool.

Examples:

- `filesystem.workspace.read`
- `filesystem.workspace.write`
- `artifact.create`
- `artifact.read`
- `media.generate.image`
- `media.generate.video`
- `media.generate.audio`
- `browser.read`
- `browser.fill`
- `telegram.propose_send`
- `discord.propose_send`
- `mcp.use.allowlisted`
- `skills.create`
- `skills.update`
- `memory.read`
- `memory.write`

Boundary actions requiring approval or Hades execution:

- `telegram.send`
- `discord.send`
- `email.send`
- `browser.submit`
- `public.publish`
- `calendar.write`
- `payments.spend`
- `data.delete`
- `integration.connect_or_revoke`

## Telegram GIF Reinterpretation

The current Telegram GIF bug likely comes from an overly narrow action bridge:

- Hermes may answer with text or raw media URLs.
- Hades only sends an animation when it sees `outboundActions: [{ type: "send_gif" }]`.

In the revised model, Hermes can:

- create or select a GIF/media artifact in its workspace
- return a proposed Telegram animation action
- let Hades verify and send through the correct user-scoped Telegram connection

Direct Hermes gateway delivery remains possible later, but only if:

- gateway runs under user-scoped `HERMES_HOME`
- secrets are user-scoped and encrypted
- Hades can observe/audit deliveries
- Hades can enforce allowlists and approvals

## Study Conclusion

The strongest architecture is not "Hermes does everything directly" and not "Hades manually models every Hermes tool." It is:

```text
Hermes user universe + Hades boundary governor
```

The immediate plan should shift from Supabase-first skill persistence to R2-backed Hermes home/state persistence with Supabase indexes. The handoff and TDD tests should verify:

- per-user `HERMES_HOME`
- R2 hydration/snapshot/sync
- Supabase metadata index
- signed routing tokens
- capability envelopes
- boundary approval/execution
- Railway/browser E2E
