# MEMORY.md - Persistent Context

**Last updated:** 2026-06-13
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

### In Progress
- [ ] Implement multi-user auth + Hermes isolation via TDD (14 test files, ~60+ tests)

### Next
- Phase 1: auth middleware — requireHadesAuth() (6 tests)
- Phase 2: tenant-scoped repositories (6 files, 5 tests each)
- Phase 3: social connection isolation — verifySocialAccount (8 tests)
- Phase 4: Telegram token encryption/decryption
- Phase 5: Hermes scoped context builder (8 tests)
- Phase 6: runtime trigger isolation (8 tests)
- Phase 7: Hermes output validator (7 tests)
- Phase 8: execution logs (7 tests)
- Phase 9: cross-user regression tests (10 tests)
- Phase 10: frontend auth/state safety (10 tests)

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
