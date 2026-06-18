# Hermes Discovery Report

> Findings from Railway production probe, CLI analysis, and codebase review.
> v0.1 | 2026-06-18

---

## Overview

Hermes (Nous Research) is a Python-based autonomous agent. Hades installs it
via `pip install hermes-agent` in the Dockerfile and currently uses the
undocumented `--oneshot` flag for stateless prompt execution. This document
captures everything learned from probing Hermes v0.16.0 on a Railway production
container.

---

## Environment

| Property | Value |
|----------|-------|
| Hermes version | v0.16.0 (2026.6.5) |
| Binary path | `/opt/hermes-venv/bin/hermes` |
| Python | 3.11.2 |
| Install size | 183 MB |
| OpenAI SDK | 2.24.0 |
| Default model | NousResearch/Hermes-3 |
| Container OS | Debian (node:22-slim) |
| RAM (container limit) | 7.5 GB |
| CPU cores | 48 |
| Railway project | virtuous-tranquility |
| Railway service | hades-os-monorepo |

The container is generously provisioned. 7.5 GB RAM.

## Memory Footprint: ~140 MB Idle RSS

**Measured 2026-06-18:** An idle Hermes process (post-import, post-startup,
before any LLM call) uses **~140 MB RSS**.

| State | RSS | Notes |
|-------|-----|-------|
| Idle container (no Hermes) | 83 MB | PID 1 (Node.js server) + minor procs |
| After `hermes chat -q hello -Q` spawn | +140 MB | Python modules loaded, workspace init |
| Workspace size on disk | 27 MB | SQLite DB, caches, logs, skills, tirith |

### Capacity Math

With 7.5 GB available:

| Scenario | Processes | Memory used | Headroom |
|----------|-----------|-------------|----------|
| Light use | 5 | 783 MB | 6.7 GB |
| Medium use | 10 | 1.5 GB | 6.0 GB |
| Heavy use | 20 | 2.9 GB | 4.6 GB |
| Max safe | ~40 | 5.7 GB | 1.8 GB |

**Conclusion:** Even at 20 concurrent Hermes processes, the container has
4.6 GB headroom. Memory is not the bottleneck.

### Caveats

- ~140 MB is idle RSS (post-import). Active RSS during LLM call may be higher.
- Loading 20+ toolsets at startup adds memory. A minimal toolset could reduce baseline.
- The 83 MB base includes Node.js server + Python runtime (even before Hermes).

---

## CLI Architecture

Hermes uses a `parent → subcommand` argument structure:

```
hermes [parent-flags] <subcommand> [subcommand-flags]
```

### Parent-Level Flags

Flags that apply before the subcommand (and may affect all subcommands):

- `-m MODEL, --model MODEL` — model override
- `--provider PROVIDER` — API provider override
- `-t TOOLSETS, --toolsets TOOLSETS` — comma-separated toolsets
- `--skills SKILLS` — comma-separated skill names to load
- `--resume SESSION` — resume a session by ID
- `--continue [NAME]` — continue last session (optionally by name)
- `--worktree` — worktree mode
- `--accept-hooks` — accept hook executions
- `--yolo` — bypass safety confirmations
- `-z PROMPT` — quick single-token prompt (experimental)

### Subcommands (50 total)

All discovered subcommands:

| Subcommand | Purpose | Tested |
|---|---|---|
| `chat` | Interactive/single-query chat | Yes |
| `skills` | Skill management | Yes (`list`) |
| `profile` | Profile management | Yes (`list`) |
| `model` | Model management | No |
| `fallback` | Fallback provider config | No |
| `secrets` | Secrets management | No |
| `sessions` | Session management | No |
| `memory` | Memory management | No |
| `tools` | Tool management | No |
| `mcp` | MCP protocol | No |
| `checkpoints` | Checkpoint save/restore | No |
| `config` | Config management | No |
| `gateway` | API gateway | No |
| `proxy` | Proxy config | No |
| `cron` | Cron jobs | No |
| `webhook` | Webhooks | No |
| `portal` | Portal management | No |
| `kanban` | Kanban board | No |
| `hooks` | Hook management | No |
| `doctor` | Health diagnostics | No |
| `security` | Security audit | No |
| `backup` | Backups | No |
| `dump` | State dump | No |
| `debug` | Debug commands | No |
| `import` | Data import | No |
| `bundles` | Bundle management | No |
| `plugins` | Plugin management | No |
| `curator` | Content curation | No |
| `computer-use` | Computer use automation | No |
| `claw` | Tool execution | No |
| `pairing` | Device pairing | No |
| `completion` | Shell completions | No |
| `dashboard` | Web dashboard | No |
| `desktop` | Desktop app | No |
| `gui` | GUI mode | No |
| `logs` | Log viewing | No |
| `prompt-size` | Prompt size calc | No |
| `whatsapp` | WhatsApp integration | No |
| `slack` | Slack integration | No |
| `send` | Send messages | No |
| `login` / `logout` / `auth` | Authentication | No |
| `status` | Status info | No |
| `lsp` | Language server | No |
| `setup` / `postinstall` | Installation | No |
| `migrate` | DB migrations | No |
| `update` / `uninstall` / `version` | Lifecycle | No |
| `insights` | Usage insights | No |
| `acp` | ACP protocol | No |

**50 subcommands total.** The agent surface is enormous.

---

## Chat Mode — The Key Discovery

`hermes chat` is the primary interaction mode. It has two variants:

### Interactive Mode (default)

```
hermes chat -m deepseek/deepseek-v4-flash --provider openrouter
```

Opens a TUI with:
- Available tools list (20+ toolsets loaded by default)
- Available skills list (0 installed by default)
- Prompt input with `/` commands
- Real-time status display
- Session tracking (session ID: `20260618_035824_eb9acc` format)

### Single-Query Mode (`-q` / `--query`)

```
hermes chat -q "<single-query>" -Q -m model --provider provider
```

- `-q VALUE` or `--query VALUE` — the single query string
- `-Q` or `--quiet` — suppress TUI output (machine-readable)

**Important:** The `-q` flag takes a single token (no spaces). Multi-word
queries must be passed via stdin pipe.

**Confirmed working:** Stdin piping works. Hermes reads from stdin when
provided.

### Session Persistence

Each chat session gets a unique ID (`20260618_035824_eb9acc`). The `--resume`
and `--continue` flags can resume previous sessions, suggesting context is
stored somewhere (likely `~/.hermes/`).

---

## Skills System

Skills are Hermes' procedural memory — reusable workflows that become native
tool calls.

### Current State on Railway

```
$ hermes skills list

 Name            Category    Source    Trust    Status
 ───────────────    ──────────    ────────    ───────    ─────────
 hades-probe      devops      local     local     enabled
```

### Management

Skills are managed via the `hermes skills` subcommand:
- `hermes skills list` — list installed skills
- `hermes skills create` — create a new skill
- `hermes skills install` — install a skill from source
- `hermes skills delete` — remove a skill

### ✅ Confirmed: Skills Persist Across Process Exits

**Confirmed 2026-06-18:** Skills DO survive Hermes process exit.

A skill created during a timed-out `chat --query` session was found alive
in a subsequent `hermes skills list` call. The skill file at
`/tmp/hades-hermes/skills/devops/hades-probe/SKILL.md` was written before
the timeout killed the process.

### ✅ Confirmed: Skill File Format

Each skill is stored as `SKILL.md` — a Markdown file with YAML frontmatter:

```yaml
---
name: hades-probe
description: Comprehensive health/diagnostics probe for the Hades Hermes orchestration runtime
version: 1.0.0
platforms: [linux]
metadata:
  hermes:
    tags: [hades, diagnostics, health-check, runtime, probe]
    category: devops
    requires_toolsets: [terminal, file]
---
```

The body is markdown instructions for the skill's behavior.

### Skill Storage Location

```
$HERMES_HOME/
  skills/
    .usage.json              # usage tracking per skill
    .hub/lock.json           # hub state
    .hub/audit.log           # audit trail
    .hub/index-cache/        # cached skill index
    .hub/quarantine/         # quarantined skills
    .curator_state           # curator state
    {category}/
      {skill-name}/
        SKILL.md             # skill definition
```

### Known Limitation

Skills are stored under `/tmp/hades-hermes/skills/` — ephemeral in-memory
filesystem. They survive Hermes process exit but NOT Railway container
restarts or deployments. Supabase sync is still required for full persistence.

---

## Profile System

```
$ hermes profile list

 Profile          Model    Gateway      Alias    Distribution
 ───────────────    ──────   ───────────   ───────   ────────────────────
 ◆default         —        stopped      —        —
```

### Observations

- One default profile exists but has no model configured
- Profile is "stopped" — needs a model assigned
- Profiles configure: model, provider, gateway, alias, distribution
- Create with: `hermes profile create <name> -m <model> --provider <provider>`

Profiles may be the key to per-user isolation. If each profile gets its own
`HERMES_HOME/home/<profile>/` subdirectory (as hinted in the TUI tip:
"Each profile gets its own subprocess HOME at HERMES_HOME/home/ — isolated
git, ssh, npm, gh configs"), this provides natural per-user isolation.

---

## ✅ `HERMES_HOME` Env Var — Confirmed

**Confirmed 2026-06-18:** `HERMES_HOME` is a fully supported env var that
controls the Hermes agent workspace path. Currently set to:

```
HERMES_HOME=/tmp/hades-hermes
```

Set by Hades at `hermesRuntime.service.js:239-241`:

```js
if (!subprocessEnv.HERMES_HOME) {
  subprocessEnv.HERMES_HOME = "/tmp/hades-hermes";
}
```

This is the key enabler for per-user isolation:
- Set `HERMES_HOME=/data/hermes/{userId}/` to give each user their own workspace
- Profiles get isolated sub-homes under `HERMES_HOME/home/<profile>/`
- Skills, sessions, memories, caches all live under `HERMES_HOME`

### Also: `HERMES_BIN_PATH` and `HERMES_CACHE_DIR`

- `HERMES_BIN_PATH` — controls the Hermes binary path (default: auto-detect)
- `HERMES_CACHE_DIR` — controls the cache directory (default: `$HERMES_HOME/cache`)
- Both are set by Hades in `hermesRuntime.service.js`

### Full Workspace Structure

```
$HERMES_HOME/
  SOUL.md                 # Agent identity/persona
  state.db                # SQLite state (sessions, conversations)
  auth.json               # Auth tokens
  .hermes_history         # Command history
  bin/
    tirith                # Security scanner (22MB binary)
  skills/                 # Skills (see above)
  sessions/               # Saved sessions (currently empty)
  memories/               # Agent memories (currently empty)
  cache/                  # Model caches
  logs/
    agent.log             # Agent activity log
    errors.log            # Error log
    curator/              # Curator logs
  cron/                   # Cron job files
  hooks/                  # Hook files
  sandboxes/singularity/  # Tool sandbox
  image_cache/            # Cached images
  audio_cache/            # Cached audio
  pairing/                # Device pairing
```

### SQLite State Database

`$HERMES_HOME/state.db` is a SQLite database that stores agent state
(sessions, conversations, etc.). It has WAL mode enabled (state.db-wal,
state.db-shm present). This is the session persistence mechanism — resuming
a session reads from this DB.

---

## Tool Surface

20+ toolsets are loaded by default:

| Toolset | Tools |
|---------|-------|
| browser | browser_back, browser_click, browser_forward, browser_go, browser_next, browser_refresh, browser_snapshot, browser_text |
| browser-cdp | browser_cdp, browser_dialog |
| clarify | clarify |
| code_execution | execute_code |
| computer_use | computer_use |
| cronjob | cronjob |
| delegation | delegate_task |
| discord | discord |

(and 12+ more not captured)

This is a massive tool surface. For multi-tenant safety, most of these tools
will need sandboxing or restriction.

---

## Container Resources

### Memory

```
MemTotal:       338368116 kB  (host total, ~338 GB — shared host)
cgroup limit:   8000000000    (container limit, ~7.5 GB)
MemFree:         6700396 kB   (6.7 GB free)
MemAvailable:   203564024 kB  (host available)
```

The container has a **7.5 GB memory limit**. Actual Hermes memory usage
(Python idle RSS) has not been measured yet.

### CPU

```
processor count: 48
```

48 logical cores available. CPU is not a constraint.

### Disk

Hermes install is 183 MB. No other disk measurements taken.

---

## ✅ Answered Questions

| # | Question | Answer |
|---|----------|--------|
| 1 | Skills survive process exit? | **Yes** — confirmed. `/tmp/hades-hermes/skills/` persists between chat sessions |
| 2 | `HERMES_HOME` env var works? | **Yes** — fully supported. Set by Hades in `hermesRuntime.service.js:240` |
| 3 | Survive Railway deploy? | **No** — it's under `/tmp/` (ephemeral in-memory) |
| 4 | Skill file format? | **Markdown with YAML frontmatter** (`SKILL.md`) |
| 5 | Session storage? | **SQLite** at `$HERMES_HOME/state.db` |
| 6 | `HERMES_BIN_PATH`? | **Yes** — controls binary path |
| 7 | `HERMES_CACHE_DIR`? | **Yes** — controls cache location |

## Open Questions

1. **Idle RSS:** What is the actual memory footprint of an idle Hermes process?
2. **Concurrent requests:** Can we send multiple queries to the same process via stdin?
3. **IPC protocol:** Does Hermes support JSON-line IPC over stdin/stdout?
4. **--skills flag:** Does `hermes chat --skills skill1,skill2` load skills correctly?
5. **Haiku mode:** Is there a fast/summary response mode?
6. **Session resume:** Does `--resume SESSION_ID` restore full context from state.db?
7. **Redeploy survival test:** After Railway deploy, is `/data/` persistent?

---

## Quick Fixes (Independent of Architecture)

These improve the current `--oneshot` experience regardless of the autonomous
architecture decision:

1. **Telegram typing indicator** — call `sendChatAction('typing')` before processing
2. **Timeout 120s → 30s** — one-line default change in hermesRuntime config
3. **In-process queue** — serialize Hermes tasks per user (BullMQ infra exists)
4. **Rate limiter** — sliding window per user
5. **SSE streaming** — stream response tokens to web UI

---

## Files Referenced

- `backend/src/modules/hades/services/hermesRuntime.service.js` — current oneshot spawn
- `backend/src/modules/hades/services/hermes.service.js` — prompt builder
- `backend/src/modules/hades/studies/autonomous-hermes-cloud-study.md` — architecture study
- `backend/Dockerfile` — Hermes install
- `docs/hermes/hermes-discovery.json` — structured agent-readable version of this
