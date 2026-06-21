# MEMORY.md - Persistent Context

**Last updated:** 2026-06-21
**Branch:** `master`
**Latest commit:** `unknown`
**Active module:** `none`
**State file:** `buildplan/agent_state.json`

---

## PROJECT OVERVIEW

A project using context engineering.

---

## ACTIVE MODULE

---

## ACTIVE MODULE

_No active module._

---

## MODULE STATUS

---

## LINT GATE

Last run: `never`
Result: `⏳`

Before module transition: `python additional-modules/scripts/check_gate.py --module <slug>`

---

## CONTEXT BUDGET

Hard limit: 64,000 tokens
Current usage: 0 tokens
Remaining: 64,000 tokens
Session start: `—`

---

## SESSION ARCHIVES

Index: `additional-modules/work-log/sessions/INDEX.md`

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
- Hard ~64k token limit with compact procedure
- Session memory: read MEMORY.md on start, archive + prune on end
- Terse bullets, no prose
