# MEMORY.md - Persistent Context

**Last updated:** 2026-06-14
**Branch:** `codex/issue-1-hermes-discord-minion-runtime`
**Latest commit:** `0cd071f`
**Active module:** `control-platform`
**State file:** `buildplan/agent_state.json`

---

## PROJECT OVERVIEW

Hades OS — multi-user auth isolation for shared Hermes runtime. Backend owns identity, isolation, memory retrieval. Hermes is shared; user context is not shared.

---

## ACTIVE MODULE

---

## ACTIVE MODULE

| Field | Value |
|-------|-------|
| Slug | `control-platform` |
| Kind | `domain` |
| Phase | `implementation` |
| Backend | `implementing` |
| Frontend | `implementing` |
| Started | `2026-06-13T21:00:12.266+00:00` |

### Next
- Create Supabase tables from migration SQL 001_hades_tables.sql in production Supabase project
- Deploy: set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY env vars
- Run ops schema tests against production Supabase
- Deploy: set ENCRYPTION_KEY env var for AES-256-GCM token encryption

---

## MODULE STATUS

Registry: `backend/src/shared/contracts/registry.json` (vv001)
Total: 0 | Implemented: 0 | Planned: 0 | Gate: 0

| Slug | Backend | Frontend | Last Touched |
|------|---------|----------|--------------|
| `control-platform` | `scaffolded` | `scaffolded` | `—` |

---

## LINT GATE

Last run: `2026-06-13T21:00:12.266+00:00`
Result: `✅`
Message: `passed`

Before module transition: `python additional-modules/scripts/check_gate.py --module <slug>`

---

## CONTEXT BUDGET

Hard limit: 28,000 tokens
Current usage: 0 tokens
Remaining: 28,000 tokens
Session start: `None`

---

## SESSION ARCHIVES

Index: `additional-modules/work-log/sessions/INDEX.md`
- `2026-06-14-chat-cards-pending-voice`
**Active:** `ses_2026-06-14-chat-cards-pending-voice`

---

## STATE MANAGEMENT

### Files
- `buildplan/agent_state.json` — **machine-readable** source of truth (agent writes)
- `buildplan/agent_state.sha256` — integrity checksum
- `buildplan/context_budget.json` — token budget tracker
- `MEMORY.md` — **rendered view** (read-only to agent)

### Workflow
1. Agent updates `agent_state.json` directly
2. Run `python additional-modules/scripts/render_memory.py` to regenerate `MEMORY.md`
3. Run `python additional-modules/scripts/check_gate.py --module <slug>` before module transition
4. Run `python additional-modules/scripts/measure_context.py --tokens <count>` to check budget

---

## AGENT RULES

- MEMORY.md is **read-only** — write to `agent_state.json` instead
- Hard ~28k token limit with compact procedure
- Session memory: read MEMORY.md on start, archive + prune on end
- Terse bullets, no prose
