# AGENTS.md - Agent Rules

## Cache Policy

AGENTS.md is cache-stable. Do not rewrite, reorder, or casually edit it during normal work.
Put task-specific instructions in user prompt, CURRENT_TASK.md, or session notes.

Stable boot order:
1. AGENTS.md
2. MEMORY.md
3. CODE_IMPLEMENTATION.md when the task touches external dependencies, APIs, auth, database, deployed services, Hermes, Supabase, Vercel, Railway, OAuth, or cross-service routing
4. current task
5. current errors/files/screenshots

---

# 1. Prime Directive

This document defines the agent's contract. The agent must follow state management,
context budget, lint, and memory workflows on every session. Deviations require an
explicit instruction from the user.

For integration work, this file is not enough. Read `CODE_IMPLEMENTATION.md` before
touching external dependencies, APIs, auth, database, deployed services, Hermes,
Supabase, Vercel, Railway, OAuth, or cross-service routing. If the code and the docs
conflict, report the conflict and resolve it with local docs, tests, schemas, generated
types, or existing implementation evidence. Do not guess.

---

# 2. State Management

**Source of truth:** `additional-modules/buildplan/agent_state.json` (machine-readable, agent writes here)
**Checksum:** `additional-modules/buildplan/agent_state.sha256` (auto-updated on every state change)
**View:** `MEMORY.md` (read-only for agent, generated from agent_state.json)

### Workflow
1. **Read `MEMORY.md` on session start** -- restore project context
2. **Edit `additional-modules/buildplan/agent_state.json`** -- update state as you work
3. **Regenerate `MEMORY.md`** -- run `python3 additional-modules/scripts/render_memory.py`
4. **Archive session** -- run `python3 additional-modules/scripts/measure_context.py --archive-session --slug <slug> --tokens <count>`

---

# 3. Context Budget

- **Ceiling:** 64,000 tokens per session (warn-only -- never aborts the agent)
- **Tracked by:** `additional-modules/scripts/measure_context.py`
- **Tracker:** `additional-modules/buildplan/context_budget.json`
- **Check status:** `python3 additional-modules/scripts/measure_context.py --status`
- **Start session:** `python3 additional-modules/scripts/measure_context.py --tokens 0 --start-session`

### Session Archives
- Location: `additional-modules/work-log/sessions/`
- Format: `{YYYY-MM-DD}-{slug}.md`
- Index: `additional-modules/work-log/sessions/INDEX.md`

---

# 4. OpenCode Context Policy

**Configuration file:** `additional-modules/context-engineering/opencode.json`
**Context limit:** 64000 tokens
**Compaction target:** 57600 tokens
**Reserved compaction space:** 4000 tokens

| Layer | Enforcer | What it does |
|---|---|---|
| Live chat compaction | `additional-modules/context-engineering/opencode.json` | Auto-compact before context overflow; prune old tool outputs |
| Cross-session memory | `measure_context.py`, `MEMORY.md`, work-log | Track budget, archive sessions, restore state next session |

They are parallel -- OpenCode does not call `measure_context.py` unless you run it.

---

# 5. Module Gate

- Before transitioning modules, run: `python3 additional-modules/scripts/check_gate.py --module <slug>`
- Gate runs `lint:architecture` when the host project defines it

---

# 6. TDD Rule (Mandatory)

Before writing any implementation code, you MUST first write failing unit tests that define the expected behavior. This applies to every code change -- new features, bug fixes, refactors. Only implement after the tests are written and confirmed to fail. Run the tests after implementation to confirm they pass.

---

# 7. Lint Commands

| Command | Checks |
|---------|--------|
| `lint:architecture` | Composite architecture checks |
| `lint:boundaries` | Cross-module imports |
| `lint:layers` | Intra-module layer rules |

---

# 8. Memory Rules

- ~64k token ceiling with warn-only procedure (compact + archive, do not stop work)
- Session memory: read MEMORY.md on start, archive + prune on end
- Terse bullets, no prose

---

# 9. Agent Work Rules

1. Read `MEMORY.md` on session start -- restore project context
2. Edit `additional-modules/buildplan/agent_state.json` -- update state as you work
3. Regenerate `MEMORY.md` -- run `python3 additional-modules/scripts/render_memory.py`
4. Archive session -- run `python3 additional-modules/scripts/measure_context.py --archive-session --slug <slug> --tokens <count>`
5. Before transitioning modules -- run `python3 additional-modules/scripts/check_gate.py --module <slug>`

---

# 10. Output Contract

After completing work, the agent must report:

- Files changed
- Commands run
- Tests/checks run
- State updates made
- Remaining risks

---

# 11. Operator Notes

**Setup:** `node additional-modules/context-engineering/bin/context-eng.js init --opencode`

**Policy alignment:** 64k ceiling everywhere -- compact around 57600 (90%). Set `provider.<name>.models.<id>.limit.context` to **64000** (64k) in `additional-modules/context-engineering/opencode.json`; `compaction.reserved: 4000` triggers compaction before the cap.

**OpenCode discovery:** OpenCode loads `opencode.json` from the project root by default. Point it at this file with `export OPENCODE_CONFIG="$PWD/additional-modules/context-engineering/opencode.json"`, or symlink: `ln -sf additional-modules/context-engineering/opencode.json opencode.json`.

**Avoid false "interrupted":** Do not send a new message while the agent is still running -- OpenCode cancels the in-flight turn (`session.prompt cancel`).

**Runtime compaction smoke test:** Config/threshold tests verify readiness only. To observe actual OpenCode runtime compaction, generate a large payload and have OpenCode itself read it during a live session:

```bash
python3 additional-modules/scripts/gen_compaction_payload.py --tokens 70000 --output /tmp/opencode_70k_payload.txt
```

Then follow: `additional-modules/scripts/RUNTIME_COMPACTION_SMOKE_TEST.md`

---

# 12. Hermes Docs First

**Rule:** Before making any Hermes-related change (architecture, security, gateway, profile, or container changes), read the local Hermes docs cache at `docs/hermes-agent/` first. The docs contain authoritative information about profile API server ports, loopback binding, profile creation, and gateway configuration.

**Location:** `docs/hermes-agent/` -- pages split from upstream `llms-full.txt`. Pages are organized by topic directory, for example `user-guide/profiles.md` and `features/gateway.md`.

---

# 13. User Context Packet Rule

The user's provided task context is the highest-priority input for the task.

Before reading repo code or writing a plan, extract:

```txt
User goal:
User-provided constraints:
User-provided architecture/context:
User-provided bug symptoms:
User-provided preferred direction:
User-provided anti-goals:
Exact files, docs, APIs, or systems mentioned:
```

Do not ignore pasted context because the repo contains something different. If repo evidence conflicts with user context, report the conflict explicitly and resolve it using local docs, tests, schemas, generated types, or existing implementation.

---

# 14. Evidence Log Requirement

Before coding, produce a short evidence log:

```txt
User context read:
Repo files inspected:
Local docs inspected:
Existing implementation inspected:
Dependency versions confirmed:
External call signatures confirmed (path:line or doc anchor):
Tests or schemas inspected:
Unknowns:
```

Do not proceed to implementation with an empty evidence log. Do not say "based on the docs" unless the specific docs were actually inspected. If an external call appears in the diff, confirm its signature from local docs, installed types/source, schemas, or official docs for the installed version.

---

# 15. Glue-Code-First Rule

Default output for "integrate X" or "use Y" tasks is a thin call site, not new logic.

Before writing any function body that touches an external dependency:
1. Locate the actual signature in `node_modules`, `vendor`, local docs, official docs matched to the confirmed installed version, or an OpenAPI/schema file.
2. Record the source path/line or doc anchor in the evidence log.
3. Write only shape translation, auth header injection, and minimal orchestration.

Stop and report a gap instead of writing custom logic if the only source is model memory, if the dependency behavior contradicts the task handoff, or if the capability is not exposed at the confirmed installed version.

Smell test: if "integration" code contains conditionals, retries, parsing, or business rules beyond shape translation, confirm the dependency does not already provide that behavior before keeping it.

---

# 16. Reproduce-Before-Fix Rule

For bug fixes, do not start by changing code. First reproduce or localize using one of:

```txt
existing failing test
new regression test
manual reproduction path
logs / trace output
typecheck failure
minimal script
```

Then fix the smallest cause. After the fix, prove the same case now passes. If the bug cannot be reproduced, state what was checked and why the fix is still safe.

---

# 17. Command Discovery Rule

Do not invent build, test, lint, typecheck, migration, or dev commands. Inspect first:

```txt
package.json
README.md
AGENTS.md
Makefile / justfile
turbo.json / nx.json
vite.config.*
tsconfig.json
supabase/config.toml
opencode config files
CI workflow files
```

Use the repo's own commands. If none exists, explain the closest safe command instead of guessing.

---

# 18. Existing Dependency Docs Rule

If dependency or integration docs are present in the repo, they override model memory. Search before using dependency APIs:

```txt
docs/
references/
integrations/
examples/
vendor/
.local-docs/
README.md
CHANGELOG.md
MIGRATION.md
```

Source priority order:
1. User-provided context
2. Repo-local docs
3. Existing implementation
4. Generated types / schemas / migrations
5. Installed dependency versions
6. Tests
7. External/model knowledge only as fallback

---

# 19. Database, Schema, and Supabase Rules

Inspect schema before writing code. Check:

```txt
supabase/migrations/
generated database types
RLS policies
Edge Functions
Supabase client setup
auth helpers
.env.example
existing query patterns
```

Do not assume table names, column names, RLS behavior, or return shapes. Do not use the service role key from client-side code. Do not bypass RLS unless the code path is server-only and includes explicit ownership checks. When changing schema, include a migration and type-generation notes in the handoff.

---

# 20. Security and Secrets Rule

Never print, log, hardcode, or expose secrets:

```txt
API keys
Supabase service role keys
JWT secrets
OAuth client secrets
database URLs
webhook secrets
session tokens
private keys
```

Use existing environment variable patterns. If a required secret is missing, stop and report the missing variable name without inventing a value.

---

# 21. Small-Diff Rule

Prefer the smallest safe change. Do not perform broad refactors while fixing integration bugs unless explicitly requested. Avoid rewriting working modules, renaming unrelated files, changing public APIs unnecessarily, adding new abstractions without need, adding dependencies without approval, or moving state ownership without documenting it.

If new logic for a stated integration exceeds roughly 50 lines, stop and explain why before continuing. Every changed file must have a reason tied to the user's task.

---

# 22. Hosted Environment Verification Rule

Local-only verification does not satisfy "done" for tasks crossing a deployed-service boundary such as auth, proxy, OAuth, webhooks, or cross-service calls. See `CODE_IMPLEMENTATION.md` for this project's deployment topology and exact hosted verification gates.

A task is not done if its only proof is a test that mocks the network boundary it is supposed to verify. If live hosted verification cannot be run, state that explicitly and give the exact command or URL the user should run.

---

# 23. TDD / E2E Phase Gate Rule

This project uses TDD plus e2e tests after each phase.

Phases tagged `auth`, `proxy`, `oauth`, or `cross-service` in `CODE_IMPLEMENTATION.md` require an e2e run against the actual deployed endpoints before the phase is marked done. A local e2e test against a mock external service proves the mock contract only.

---

# 24. Legacy/Superseded Code Rule

Old code in this repo is not automatically authoritative just because it exists.

Before editing or trusting an existing module:
1. Check whether it predates the current architecture in `CODE_IMPLEMENTATION.md`.
2. Check whether it duplicates something a dependency/framework now provides natively.
3. Flag reimplementation candidates instead of building more glue around them.
4. If the user describes code as old or buggy, treat it as guilty until verified against current docs/schema/tests.

When a bug traces back to legacy code, prefer replacing the legacy path with the current dependency's native mechanism unless the user explicitly wants a minimal patch.

---

# 25. OpenCode Automation Boundary

OpenCode may handle mechanical integration only after context has been gathered. OpenCode must not auto-integrate when user context is ambiguous, repo docs conflict with implementation, dependency version is unclear, auth/RLS/security behavior is unverified, database schema is unclear, tests are missing for the integration boundary, runtime secrets are required, or state ownership is ambiguous.

Stop after planning and produce a handoff instead of guessing.

---

# 26. Definition of Done

Every completed implementation handoff must include:

```txt
Context packet summary
Evidence log
External call signatures confirmed
Implementation summary
Files changed
Tests added or updated
Reimplementation check
Commands run
Results of verification, local and hosted when boundary-crossing
Re-read diff against User Context Packet and flag drift
Known risks
Follow-up notes
```

Do not claim completion if tests, typecheck, lint, or required hosted verification were skipped. State exactly why and give exact follow-up commands.

---

# 27. Handoff Format

```txt
## Handoff

### What changed
- ...

### Why
- ...

### User context used
- ...

### Repo evidence used
- ...

### Integration boundaries touched
- ...

### Files changed
- ...

### Tests / verification
- Local command: / Result:
- Hosted command or manual check: / Result:

### Risks / unknowns
- ...

### Suggested next step
- ...
```