# MEMORY.md - Persistent Context

**Last updated:** 2026-06-13
**Branch:** `main`
**Latest commit:** `4849fe0`
**Active module:** `control-platform`
**State file:** `buildplan/agent_state.json`

---

## PROJECT OVERVIEW

Describe your project here.

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
- Phase 2: backend API routes
- Phase 2: frontend components
- Phase 2: integration tests
- Implement Supabase-backed live Hades repository wiring
- Implement Discord command adapter and GIF provider flow behind TDD contract
- Implement reusable minion assignment runtime for command and automation triggers
- Implement post-login UX v4 visual alignment with frontend-only TDD gates

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
**Active:** `ses_2026-06-13-wire-hades-context-frontend`

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
