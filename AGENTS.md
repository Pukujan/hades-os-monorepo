# AGENTS.md - Agent Rules

## Cache Policy

AGENTS.md is cache-stable. Do not rewrite, reorder, or casually edit it during normal work.
Put task-specific instructions in user prompt, CURRENT_TASK.md, or session notes.

Stable boot order:
1. AGENTS.md
2. MEMORY.md
3. current task
4. current errors/files/screenshots

---

# 1. Prime Directive

This document defines the agent's contract. The agent must follow state management,
context budget, lint, and memory workflows on every session. Deviations require an
explicit instruction from the user.

---

# 2. State Management

**Source of truth:** `additional-modules/buildplan/agent_state.json` (machine-readable, agent writes here)
**Checksum:** `additional-modules/buildplan/agent_state.sha256` (auto-updated on every state change)
**View:** `MEMORY.md` (read-only for agent, generated from agent_state.json)

### Workflow
1. **Read `MEMORY.md` on session start** — restore project context
2. **Edit `additional-modules/buildplan/agent_state.json`** — update state as you work
3. **Regenerate `MEMORY.md`** — run `python3 additional-modules/scripts/render_memory.py`
4. **Archive session** — run `python3 additional-modules/scripts/measure_context.py --archive-session --slug <slug> --tokens <count>`

---

# 3. Context Budget

- **Ceiling:** 64,000 tokens per session (warn-only — never aborts the agent)
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

They are parallel — OpenCode does not call `measure_context.py` unless you run it.

---

# 5. Module Gate

- Before transitioning modules, run: `python3 additional-modules/scripts/check_gate.py --module <slug>`
- Gate runs `lint:architecture` when the host project defines it

---

# 6. Lint Commands

| Command | Checks |
|---------|--------|
| `lint:architecture` | Composite architecture checks |
| `lint:boundaries` | Cross-module imports |
| `lint:layers` | Intra-module layer rules |

---

# 7. Memory Rules

- ~64k token ceiling with warn-only procedure (compact + archive, do not stop work)
- Session memory: read MEMORY.md on start, archive + prune on end
- Terse bullets, no prose

---

# 8. Agent Work Rules

1. Read `MEMORY.md` on session start — restore project context
2. Edit `additional-modules/buildplan/agent_state.json` — update state as you work
3. Regenerate `MEMORY.md` — run `python3 additional-modules/scripts/render_memory.py`
4. Archive session — run `python3 additional-modules/scripts/measure_context.py --archive-session --slug <slug> --tokens <count>`
5. Before transitioning modules — run `python3 additional-modules/scripts/check_gate.py --module <slug>`

---

# 9. Output Contract

After completing work, the agent must report:

- Files changed
- Commands run
- Tests/checks run
- State updates made
- Remaining risks

---

# 10. Operator Notes

**Setup:** `node additional-modules/context-engineering/bin/context-eng.js init --opencode`

**Policy alignment:** 64k ceiling everywhere — compact around 57600 (90%). Set `provider.<name>.models.<id>.limit.context` to **64000** (64k) in `additional-modules/context-engineering/opencode.json`; `compaction.reserved: 4000` triggers compaction before the cap.

**OpenCode discovery:** OpenCode loads `opencode.json` from the project root by default. Point it at this file with `export OPENCODE_CONFIG="$PWD/additional-modules/context-engineering/opencode.json"`, or symlink: `ln -sf additional-modules/context-engineering/opencode.json opencode.json`.

**Avoid false "interrupted":** Do not send a new message while the agent is still running — OpenCode cancels the in-flight turn (`session.prompt cancel`).

**Runtime compaction smoke test:** Config/threshold tests verify readiness only. To observe actual OpenCode runtime compaction, generate a large payload and have OpenCode itself read it during a live session:

```bash
python3 additional-modules/scripts/gen_compaction_payload.py --tokens 70000 --output /tmp/opencode_70k_payload.txt
```

Then follow: `additional-modules/scripts/RUNTIME_COMPACTION_SMOKE_TEST.md`
