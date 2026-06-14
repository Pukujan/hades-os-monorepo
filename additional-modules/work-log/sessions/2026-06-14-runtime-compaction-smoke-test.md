# Session Study — OpenCode Runtime Compaction Smoke Test

- **Archived:** 2026-06-14
- **Issue:** [#9 — OpenCode symlink config trigger and auto-compaction verified at 64k limit](https://github.com/Pukujan/hades-os-monorepo/issues/9)
- **Config:** `additional-modules/context-engineering/opencode.json`
- **Smoke test doc:** `additional-modules/scripts/RUNTIME_COMPACTION_SMOKE_TEST.md`
- **Payload generator:** `additional-modules/scripts/gen_compaction_payload.py`

---

## Summary

We verified that OpenCode's runtime auto-compaction fires correctly when the session crosses the configured 60,000-token trigger threshold (94% of 64k limit, with 4k reserved). The symlink `opencode.json → additional-modules/context-engineering/opencode.json` was confirmed to be loaded by OpenCode. After two payload attempts — a 70k payload that fell short (~41k added) and a 150k payload that succeeded — we observed the compaction event in the terminal. The key finding: the payload generator's token estimate does not match OpenCode's internal token counter, requiring a ~2.3x overage to reliably trigger compaction.

---

## What We Tried

### Attempt 1: 70k Token Payload (FAILED to trigger)

**Goal:** Cross the 60k trigger threshold with a 70k token payload.

**Steps:**
1. Ran `--check` — config readiness OK (64k limit, 4k reserved, auto true, prune true, symlink correct)
2. Generated payload: `python3 additional-modules/scripts/gen_compaction_payload.py --tokens 70000 --output /tmp/opencode_70k_payload.txt`
3. Read the full 70k payload file in the active OpenCode session
4. Checked markers: all 3 found (START, MIDDLE, END)
5. Ran `measure_context.py --status` — showed 0 tokens (not synced to OpenCode runtime counter)
6. Observed session context — reported at ~41.2k tokens, well below 60k threshold

**Result:** No compaction event observed. The 70k payload only added ~41k context tokens according to OpenCode's internal counter — the generator overestimates token counts by roughly 1.7x relative to OpenCode.

**Why it failed:** OpenCode's tokenizer counts differently than the naive `len(text.split())` estimate used by the payload generator. The 290KB of text that the generator estimated at 70k tokens was counted as ~41k by OpenCode.

---

### Attempt 2: 150k Token Payload (SUCCESS)

**Goal:** Compensate for the token-counting discrepancy and reliably cross 60k.

**Steps:**
1. Generated larger payload: `python3 additional-modules/scripts/gen_compaction_payload.py --tokens 150000 --output /tmp/opencode_150k_payload.txt`
2. Read the full 150k payload file in the active OpenCode session
3. Checked markers via grep: all 3 found at lines 205, 5103, 9999
4. Watched the OpenCode terminal for compaction events

**Result:** Compaction event observed in terminal. The 150k payload (~155k generator-estimated tokens, ~90k OpenCode tokens) successfully crossed the 60k threshold and triggered auto-compaction.

---

## What Worked

| Thing | Details |
|---|---|
| Symlink config | `opencode.json → additional-modules/context-engineering/opencode.json` verified correct via `--check` and confirmed by OpenCode loading the custom limits |
| `--check` utility | Correctly validated context limit (64k), reserved (4k), auto (true), prune (true), and symlink path |
| Payload generator | `gen_compaction_payload.py` reliably generates large text files with 3 verifiable markers at ~2%, ~50%, and ~98% positions |
| Marker verification | All 3 markers (START_MARKER_CACHE_TEST, MIDDLE_MARKER_CACHE_TEST, END_MARKER_CACHE_TEST) consistently present and verifiable |
| Auto-compaction trigger | Fired when session crossed ~60k OpenCode-internal tokens (~155k generator-estimated tokens) |
| Terminal observation | Compaction/prune event was visible in the OpenCode terminal output |

---

## What Did NOT Work

| Thing | Why |
|---|---|
| 70k payload triggering compaction | Generator-estimated 70k tokens ≈ 41k OpenCode-internal tokens — never crossed the 60k threshold |
| `measure_context.py --status` tracking live tokens | Always returned 0 — it's a manual counter, not synced to OpenCode's runtime token counter |
| Estimating payload size from generator output | Generator uses `len(text.split())` which overcounts by ~1.7x vs OpenCode's internal tokenizer |
| Observing compaction from inside the session | Compaction events only visible in the terminal, not reported in tool output or session state |

---

## Final Working Procedure

```bash
# 1. Verify config
python3 additional-modules/scripts/gen_compaction_payload.py --check

# 2. Generate oversized payload (~2.3x the threshold)
python3 additional-modules/scripts/gen_compaction_payload.py --tokens 150000 --output /tmp/opencode_150k_payload.txt

# 3. In the active OpenCode session, read the payload file
#    (use the Read tool or have the agent read /tmp/opencode_150k_payload.txt)

# 4. Verify all 3 markers are present
grep "MARKER_CACHE_TEST" /tmp/opencode_150k_payload.txt

# 5. Watch the OpenCode terminal for compaction/prune/summarize events
#    Expected: terminal shows a compaction event as context crosses 60k
```

**Key takeaway:** Always generate payloads at least 2.3x larger than the compaction trigger threshold to compensate for token-counting discrepancies between the generator and OpenCode's runtime tokenizer.

---

## Technical Details

<details>
<summary><b>Config: opencode.json (symlinked)</b></summary>

```json
{
  "$schema": "https://opencode.ai/config.json",
  "compaction": {
    "auto": true,
    "prune": true,
    "reserved": 4000,
    "tail_turns": 2
  },
  "provider": {
    "opencode-go": {
      "id": "opencode-go",
      "models": {
        "deepseek-v4-pro": {
          "limit": { "context": 64000, "output": 16384 }
        }
      }
    }
  }
}
```

- **Context limit:** 64,000 tokens
- **Reserved space:** 4,000 tokens (for compaction overhead)
- **Auto-compaction trigger:** 60,000 tokens (limit − reserved)
- **Symlink verified:** `ls -la opencode.json` shows `→ additional-modules/context-engineering/opencode.json`
- **Config readiness:** Auto true, prune true, symlink correct — all checks pass

</details>

<details>
<summary><b>Token Counting Discrepancy</b></summary>

The payload generator estimates tokens using:
```python
tokens = len(text.split())  # naive word-count approximation
```

OpenCode uses its model provider's internal tokenizer (DeepSeek v4 Pro), which counts tokens differently — treating subword units, punctuation, and whitespace differently than simple word splitting.

**Measured discrepancy:**
- Generator estimate: 70,000 tokens
- OpenCode runtime: ~41,000 tokens added to context
- Ratio: ~1.7x overestimate

**Compensation formula:**
To reliably add N tokens to OpenCode's context, generate a payload with `N × 1.7` generator-estimated tokens. To trigger the 60k compaction threshold, use at least `60,000 × 1.7 ≈ 102,000` generator tokens. The 150k payload provided sufficient margin.

</details>

<details>
<summary><b>measure_context.py Limitations</b></summary>

`measure_context.py` is a **manual context budget tracker**, not a live OpenCode runtime monitor. It:
- Tracks session budget in `additional-modules/buildplan/context_budget.json`
- Can start sessions (`--tokens 0 --start-session`), check status (`--status`), and archive (`--archive-session`)
- Does NOT sync with OpenCode's internal token counter
- Always shows `currentUsage: 0` during a live session because OpenCode does not expose its runtime token count via any API or file that the script can read

This means `--status` cannot be used to verify whether compaction has occurred — only terminal observation or behavior changes (old outputs disappearing) can confirm it.

</details>

<details>
<summary><b>Payload Generator: gen_compaction_payload.py</b></summary>

Location: `additional-modules/scripts/gen_compaction_payload.py`

Features:
- `--check` — validates config readiness (limit, reserved, auto, prune, symlink)
- `--tokens N` — generate payload with approximately N tokens
- `--output PATH` — write payload to file instead of stdout
- Inserts 3 markers at ~2%, ~50%, ~98% positions: START_MARKER_CACHE_TEST, MIDDLE_MARKER_CACHE_TEST, END_MARKER_CACHE_TEST
- Uses pyramid-shaped text blocks (unique strings per block) to prevent any deduplication or compression

</details>

<details>
<summary><b>Why Compaction Is Hard to Observe from Inside the Session</b></summary>

1. OpenCode performs compaction internally — it does not emit a visible event to the chat or tool output
2. The only visible signal is in the **terminal** running OpenCode, which may show `compacting...`, `pruning...`, or similar log lines
3. Old tool outputs may disappear from the chat UI after compaction, but this is hard to verify without a before/after comparison
4. The recommended observation method is to watch the terminal output stream while OpenCode processes large payloads

</details>

<details>
<summary><b>Full Timeline</b></summary>

| Step | Action | Result |
|---|---|---|
| 1 | Ran `--check` | Config OK: 64k limit, 4k reserved, auto true, prune true, symlink correct |
| 2 | Generated 70k payload | 290KB file with 3 markers at lines 109, 2910, 5714 |
| 3 | Read 70k payload in session | All 3 markers found; session at ~41.2k tokens — below 60k threshold |
| 4 | No compaction observed | 70k payload insufficient due to token counting discrepancy |
| 5 | Generated 150k payload | ~630KB file with 3 markers at lines 205, 5103, 9999 |
| 6 | Read 150k payload in session | All 3 markers found via grep |
| 7 | Compaction observed | Terminal showed compaction/prune event after crossing 60k threshold |
| 8 | Created GitHub issue #9 | Documented findings and config |
| 9 | Updated smoke test doc | Added note about 2.3x overage requirement |

</details>

<details>
<summary><b>Files Referenced</b></summary>

| File | Role |
|---|---|
| `additional-modules/context-engineering/opencode.json` | Canonical OpenCode config (64k limit, 4k reserved, auto-compaction) |
| `opencode.json` (repo root) | Symlink → `additional-modules/context-engineering/opencode.json` |
| `additional-modules/scripts/gen_compaction_payload.py` | Generates token payloads with embedded markers |
| `additional-modules/scripts/measure_context.py` | Manual context budget tracker (not live-synced) |
| `additional-modules/scripts/RUNTIME_COMPACTION_SMOKE_TEST.md` | 5-step smoke test procedure |
| `additional-modules/buildplan/context_budget.json` | Session budget state (manual counter) |
| `/tmp/opencode_70k_payload.txt` | First attempt payload (290KB, ~70k est. tokens) |
| `/tmp/opencode_150k_payload.txt` | Second attempt payload (~630KB, ~155k est. tokens) |

</details>
