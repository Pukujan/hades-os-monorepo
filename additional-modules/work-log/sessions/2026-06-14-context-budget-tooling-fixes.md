# Session archive — 2026-06-14-context-budget-tooling-fixes

- **Archived:** 2026-06-14
- **Peak usage:** 70,000 tokens
- **Budget file:** `additional-modules/buildplan/context_budget.json`

## What changed

### measure_context.py
- HARD_LIMIT: 28k → 40k (matches AGENTS.md contract)
- WARN_THRESHOLD: 18k → 32k (80% of 40k)
- CRITICAL_THRESHOLD: 25.2k → 36k (90% of 40k)
- default_budget(): added warningAt/compactAt/stopAt fields
- print_status(): now shows all threshold levels
- main() output: four-tier (OK → WARNING → COMPACT → STOP → CRITICAL), reads thresholds from budget file
- All output goes to stdout (was stderr for some levels)
- Docstring updated to match 40k

### archive_session() slug dedup
- Strips leading `YYYY-MM-DD-` prefix from slug before constructing filename
- Prevents `2026-06-14-2026-06-14-<slug>.md` double-dating

### opencode.json
- Provider key: `opencode` → `opencode-go` (matches actual provider in model ID)
- Model: `kimi-k2.7-code` → `deepseek-v4-pro` (matches actual model)
- Removed stale `big-pickle` entry
- compaction.auto: true, reserved: 4000

### render_memory.py
- Default fallback values: 28k → 40k
- Agent rules text: "~28k" → "~40k"

## Why compaction wasn't triggering this session
OpenCode loads `opencode.json` at session start. The previous config had `opencode/big-pickle` and `opencode/kimi-k2.7-code` — neither matched the running model `opencode-go/deepseek-v4-pro`. Without a matching model entry, OpenCode didn't know the 40k limit. The fix takes effect on next session.

## Validation
- 13/13 pytest tests (RED → GREEN)
- Console smoke test: all 5 threshold tiers fire correctly
- Symlink `opencode.json` → `additional-modules/context-engineering/opencode.json` verified

## Files
- `additional-modules/scripts/measure_context.py`
- `additional-modules/scripts/render_memory.py`
- `additional-modules/context-engineering/opencode.json`
- `additional-modules/scripts/tests/test_measure_context.py`
- `additional-modules/buildplan/agent_state.json`
- `additional-modules/buildplan/context_budget.json`
- `additional-modules/work-log/sessions/INDEX.md`
