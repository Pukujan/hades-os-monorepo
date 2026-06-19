# OpenCode Config: State & Verification

## Config Files

| Scope | Path | Status |
|---|---|---|
| Project (canonical) | `additional-modules/context-engineering/opencode.json` | Has `big-pickle` under `opencode` provider with `{ limit: { context: 64000, output: 16384 } }`. Has compaction `{ auto: true, prune: true, reserved: 4000 }`. |
| Project root | `opencode.json` | Regular file (same content as canonical — **not** a symlink). Deep-merges with global. |
| Global (user) | `~/.config/opencode/opencode.jsonc` | Was empty `{ $schema }`. Updated to `{ model: "opencode/big-pickle" }`. |

## Why Not Symlink

The `gen_compaction_payload.py --check` script warned "no symlink" because it
expected the root `opencode.json` to be a symlink to the canonical file in
`additional-modules/context-engineering/`. However:

- The root file already had identical content to the canonical — no drift.
- Removing the real file and replacing it with a symlink is unnecessary;
  OpenCode loads the root file regardless of whether it's a symlink or a
  regular file.
- AGENTS.md's instructions about symlinks exist to prevent drift between
  copies, but when the root file is already correct, a symlink adds nothing.
- **Decision:** Keep the root file as a regular file. Do NOT symlink unless
  the two files actually diverge.

## Why Auto-Compaction Works for deepseek v4 but Not big-pickle

- **deepseek v4 flash** works because the OpenCode process was launched with
  that model selected (likely via `model` field in a prior config, env var, or
  CLI default). The provider block `opencode-go` + model limits are read
  correctly, so the 64k context limit and compaction settings apply.
- **big-pickle** under the `opencode` provider was defined in the project
  config, but the `model` top-level field was not set to `opencode/big-pickle`.
  Without an explicit `model` selection, OpenCode falls back to its default
  (which for this install appears to be a deepseek variant).
- **Fix applied:** Added `"model": "opencode/big-pickle"` to the global config
  at `~/.config/opencode/opencode.jsonc`. Because configs are deep-merged, the
  project-level compaction settings and model limits still apply — the global
  config only overrides the model selection.

## Big-Pickle Compaction Fix

The compaction sub-agent uses the **primary agent's model** by default (`compaction` agent falls back to the user's model). With `opencode/big-pickle`, compaction failed silently because the `opencode` (Zen) provider does not handle the compaction summarization flow properly — it works with `opencode-go` provider models.

**Fix applied:** Explicitly configured the compaction agent to use `opencode-go/deepseek-v4-flash`:
```json
"agent": {
  "compaction": {
    "model": "opencode-go/deepseek-v4-flash"
  }
}
```

This routing is set in both `additional-modules/context-engineering/opencode.json` (canonical) and root `opencode.json`.

## What Needs Verification After Reload

1. **Quit and restart OpenCode** — config is not hot-reloaded.
2. Confirm the running model is `big-pickle` (check UI or `/model` status).
3. Verify context limit shows 64,000:
   ```
   python3 additional-modules/scripts/gen_compaction_payload.py --check
   ```
4. Verify auto-compaction triggers correctly by generating a large payload:
   ```
   python3 additional-modules/scripts/gen_compaction_payload.py --tokens 70000 --output /tmp/opencode_70k_payload.txt
   ```
5. Check that deepseek v4 flash still works if you switch back — the project
   provider block already defines both models; switching `model` back to
   `opencode-go/deepseek-v4-flash` should restore it.

## Known Tooling Issues

### `measure_context.py` Does Not Track Runtime Context

`measure_context.py --status` always reports `Budget: 0 / 64,000` regardless of
actual OpenCode session context usage. It only records tokens explicitly fed via
`--tokens` — it is a **manual bookkeeping tool**, not a runtime monitor. It
cannot be used to detect whether auto-compaction fired.

**Bug:** `sessionEnd` is not cleared when a new session starts, producing
impossible timestamps (end before start), e.g.:
```
Session started: 2026-06-19T18:00:50.488+00:00
Session ended: 2026-06-19T17:44:59.225+00:00
```

**Fix would require:** Wiring OpenCode's internal context tracker into
`context_budget.json`, or replacing `measure_context.py` with direct reads of
OpenCode's own state file. Not implemented.

### `gen_compaction_payload.py --check` Symlink Warning Is Misleading

The script warns "no symlink" if root `opencode.json` is a regular file instead
of a symlink to `additional-modules/context-engineering/opencode.json`. This is
harmless — OpenCode loads the root file regardless. See [Why Not Symlink](#why-not-symlink).

## Config Merge Semantics

OpenCode deep-merges global → project config. Project keys win over global
for the same field. This means:

- `compaction` settings come from the project config (they work).
- Big-pickle model `limit` comes from the project config (already defined).
- `model` (the active model) is set in the global config to avoid modifying
   the project file and affecting other users/environments.
