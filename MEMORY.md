# MEMORY.md - Persistent Context

**Last updated:** 2026-06-14
**Branch:** `master`
**Latest commit:** `0ceb5ec`
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

---

## MODULE STATUS

Registry: `backend/src/shared/contracts/registry.json` (vv001)
Total: 0 | Implemented: 0 | Planned: 0 | Gate: 0

| Slug | Backend | Frontend | Last Touched |
|------|---------|----------|--------------|
| `control-platform` | `scaffolded` | `scaffolded` | `—` |

---

## LINT GATE

Last run: `2026-06-14`
Result: `✅`
Message: `passed`

Before module transition: `python additional-modules/scripts/check_gate.py --module <slug>`

---

## CONTEXT BUDGET

Hard limit: 64,000 tokens
Current usage: 0 tokens
Remaining: 64,000 tokens
Session start: `2026-06-14T19:41:00.000+00:00`

---

## SESSION ARCHIVES

Index: `additional-modules/work-log/sessions/INDEX.md`
- `2026-06-14-deploy-readiness-audit-issues`
- `2026-06-14-runtime-compaction-smoke-test`
- `2026-06-14-stabilize-agents-md-cache`
- `2026-06-14-context-budget-tooling-fixes`
- `2026-06-14-minions-ui-port`
- `2026-06-14-chat-cards-pending-voice`
**Active:** `ses_2026-06-14-vite-env-var-injection-fix`

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
