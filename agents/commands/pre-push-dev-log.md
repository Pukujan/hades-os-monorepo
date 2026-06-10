# Pre-push dev log (human + agent audit)

Create **two** dev logs before every **agent-initiated** push: one for humans, one structured JSON for agents.

Terminal `git push` by the user is allowed without dev logs. Agent shell `git push` is blocked by `.agents/hooks.json` until paired logs exist for `HEAD`.

## When to run

- Before **agent** `git push` (required — hook enforces paired logs for `HEAD`).
- When the user asks to “write dev log” / “pre-push log”.
- Optional before terminal push by the user.

## Steps

1. **Generate skeletons** (auto-fills git, tests, full repo tree):
   ```bash
   npm run dev-log:pre-push -- --slug <kebab-topic> --program 005
   ```
   Use `--no-tests` only if tests were already run and recorded manually.
   Use `--title "Readable title"` if the slug is too terse.

2. **Fill the agent log first** (`work-log/dev-logs/agent/*_dev-log-agent_*.json`):
   - Replace every `FILL` string with concrete facts.
   - `decisions[]` — id, decision, rationale, alternativesRejected, tradeoff.
   - `iterations[]` — each attempt in order.
   - `changes.narrative`, `improvements`, `tradeoffs`, `regressions`, `risks`, `followUps`.
   - `summary` — dense paragraph an agent can scan in one pass.
   - Keep `apis`, `repositoryTree.treeText`, and `git` as-is unless stale; update `apis` if you added/deprecated routes.
   - `apis.http` = active / stub / deprecated; `apis.versioned` = pipeline + prompt versions.

3. **Fill the human log** (`work-log/dev-logs/human/*_dev-log_*.md`):
   - **Part I (top):** fill **I.1 At a glance** only; leave auto audit tables and mermaid as-is unless APIs changed.
   - **Part II (bottom):** decisions, iterations, changes, outcomes — mirror the agent JSON in prose.
   - Do **not** remove Part I audit tables, mermaid blocks, or Part II full tree/git sections.

4. **Index** — add two rows to `work-log/INDEX.md` (human + agent).

5. **Verify** (optional):
   ```bash
   npm run dev-log:pre-push -- --check
   ```

## Rules

- **No secrets** — no `.env` values, API keys, or real party/filing text.
- **Pair required** — every human log must have a sibling agent JSON with the same `{NNN}_{date}_{time}` prefix.
- **Agent log is the audit source of truth** for the next session; human log is the readable narrative.
- Schema: `work-log/dev-logs/schemas/dev-log-agent.v1.schema.json`

## Filename convention

| Audience | Path | Pattern |
|----------|------|---------|
| Human | `work-log/dev-logs/human/` | `{NNN}_{YYYY-MM-DD}_{HH-MM}_dev-log_{slug}.md` |
| Agent | `work-log/dev-logs/agent/` | `{NNN}_{YYYY-MM-DD}_{HH-MM}_dev-log-agent_{slug}.json` |
