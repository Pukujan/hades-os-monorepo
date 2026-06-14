# Measure OpenCode Cache Run (Manual)

This describes a manual measurement for provider/runtime cache hit rate when using
OpenCode with a cache-stable `AGENTS.md`.

## Prerequisites

- OpenCode configured with a provider that supports prompt caching (e.g., DeepSeek
  with context caching via `opencode.json`).
- A stable `AGENTS.md` at the repo root (cache-friendly structure with
  `## Cache Policy` near the top and no task-specific content in the stable prefix).

## Procedure

### 1. Prepare the stable boot context

The boot context should be identical across runs:

1. `AGENTS.md` — cache-stable agent contract (rarely changes)
2. `MEMORY.md` — generated from `agent_state.json` (changes only when agent state changes)
3. `CURRENT_TASK.md` or a task handoff file (optional, may vary)

### 2. Run A — fresh prompt (no cached input expected)

```
# In a fresh OpenCode session with the stable boot context:
opencode "Run the contract tests: python3 additional-modules/scripts/check_agents_contract.py"
```

Note the result.

### 3. Run B — same stable prefix, different task suffix

Without changing `AGENTS.md` or `MEMORY.md`, run a **different** task that shares the same boot prefix:

```
# In a new OpenCode session with the SAME boot context:
opencode "Run the contract tests again: python3 additional-modules/scripts/check_agents_contract.py"
```

### 4. Compare provider/runtime logs

Check OpenCode provider logs or runtime output for fields like:

| Field | What it means |
|-------|---------------|
| `cache hit tokens` | Tokens served from cache in this request |
| `cache miss tokens` | Tokens NOT served from cache |
| `cached input tokens` | Total cached tokens in the prompt |
| `prompt cache hit rate` | Ratio of cache hits to total prompt tokens |
| `input token billing breakdown` | May show cached vs uncached pricing tiers |

### Expected Result

If the provider/runtime exposes cache metrics:

- **Run A** should show mostly cache misses (fresh prompt).
- **Run B** should show higher cached input / cache hit tokens because the
  stable prefix (`AGENTS.md` + `MEMORY.md`) was reused.

### If No Cache Metrics Are Exposed

If OpenCode or the provider does not expose per-request cache stats, direct
measurement is unavailable. In that case, rely on the deterministic shape test:

```
python3 additional-modules/scripts/check_prompt_cache_shape.py
```

This verifies that the repo input contract is shaped for cache reuse, even
though actual hit rate cannot be measured without provider support.

## Notes

- Do not fake or estimate cache metrics.
- The deterministic shape test is the authoritative check.
- Cache hit rate measurement is best-effort and provider-dependent.
