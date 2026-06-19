# Runtime Compaction Smoke Test

**Purpose:** Observe whether OpenCode's actual runtime auto-compaction triggers
after the session crosses the configured context threshold.

**Important:** Existing tests (`test_auto_compaction.py`, `check_agents_contract.py`,
etc.) verify config and threshold alignment only. They do **not** prove
OpenCode's internal runtime compaction fired. This smoke test attempts to
observe runtime behavior.

---

## Prerequisites

- `gen_compaction_payload.py` in `additional-modules/scripts/`
- OpenCode running with `additional-modules/context-engineering/opencode.json`
  (via symlink or `OPENCODE_CONFIG` env var)

---

## Step 1 — Confirm OpenCode Config

```bash
python3 additional-modules/scripts/gen_compaction_payload.py --check
```

Expected output:

```
Context limit: 64,000
Reserved space: 4,000
Auto-compaction trigger: 60,000 tokens (94%)
Auto enabled: True
Prune enabled: True
Symlink: correct
Config readiness: OK
```

If critical failures appear (auto not true, limit missing, reserved missing),
fix `opencode.json` first.

---

## Step 2 — Generate Payload

```bash
python3 additional-modules/scripts/gen_compaction_payload.py --tokens 70000 --output /tmp/opencode_70k_payload.txt
```

This creates a ~290KB text file with three markers:

| Marker | Position |
|--------|----------|
| `START_MARKER_CACHE_TEST` | ~2% into payload |
| `MIDDLE_MARKER_CACHE_TEST` | ~50% into payload |
| `END_MARKER_CACHE_TEST` | ~98% into payload |

---

## Step 3 — Trigger Compaction via OpenCode Itself

In the **active OpenCode session**, send this exact prompt:

```text
Runtime compaction smoke test.

Do not edit project files.

Read the entire file:

/tmp/opencode_70k_payload.txt

Then report only:

1. Whether START_MARKER_CACHE_TEST is present
2. Whether MIDDLE_MARKER_CACHE_TEST is present
3. Whether END_MARKER_CACHE_TEST is present
4. Whether you observed any OpenCode compaction/prune/summarize event in the terminal/logs
5. Whether the session context size appears to drop after reading
6. Whether this proves runtime compaction or only suggests it
```

---

## Step 4 — Watch Terminal/Logs

While OpenCode is reading the large file, watch the terminal for these terms:

- `compact`
- `compaction`
- `prune`
- `summarize`
- `summary`
- `context`
- `tokens`
- `session.compact`

You may also watch the log file if available:

```bash
python3 additional-modules/scripts/watch_opencode_compaction_logs.py --log /path/to/opencode.log
```

Or pipe OpenCode output:

```bash
opencode 2>&1 | python3 additional-modules/scripts/watch_opencode_compaction_logs.py --stdin
```

---

## Step 5 — Interpret Results

| Observation | Meaning |
|---|---|
| All markers found + terminal shows compaction/prune event | Strong evidence runtime compaction works |
| All markers found + context drops after read | Good evidence runtime compaction works |
| All markers found + no logs/drop visible | Payload was read, but compaction is not observable |
| End marker missing | OpenCode likely truncated or did not read entire file |
| Session errors before reading | Payload may exceed provider/model/session behavior |
| No compaction below 60k | Expected; threshold not crossed |

---

## Caveats

- This smoke test tests **OpenCode runtime compaction**, not **DeepSeek billing cache hits**.
- Provider-level cache hit rate requires provider billing logs, which this test does not measure.
- If OpenCode does not expose compaction events to the terminal, the test can only infer from
  behavior (context dropping, markers present, old outputs disappearing).
- Config readiness (verified by `--check`) does not guarantee runtime compaction will fire —
  only that the prerequisites are correctly configured.
- **`measure_context.py --status` is a manual bookkeeping tool**, not a runtime monitor.
  It reports `0 / 64,000` regardless of actual context usage because it only
  records tokens explicitly passed via `--tokens`. It cannot detect whether
  auto-compaction fired. See `OPCODE_CONFIG_NOTES.md` for details.

---

## Expected Success Indicators

1. `--check` reports config readiness OK.
2. Payload generates with all 3 markers.
3. OpenCode reads the file and reports all 3 markers found.
4. Terminal shows `compaction` or `compact` event.
5. ~~`measure_context.py --status` shows context below 60,000 after (if compaction pruned old outputs).~~ **Broken:** `measure_context.py` is a manual bookkeeping tool, not a runtime monitor — it always reports 0. Do not use for this.
6. Old tool outputs from before the smoke test are no longer visible in the session.

---

## Expected Failure Indicators

1. OpenCode errors out before reading the full payload.
2. END_MARKER is not found (file truncated).
3. No compaction event observed even though context exceeds 60,000.
4. Config check reports `compaction.auto: False` or missing limit/reserved.
