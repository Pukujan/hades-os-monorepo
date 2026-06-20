# Session archive - 2026-06-20-hermes-model-config-fix

- **Archived:** 2026-06-20T06:30:00.000+00:00
- **Peak usage:** 0 tokens
- **Budget file:** `additional-modules/buildplan/context_budget.json`

## What happened

- **Bug:** After 403 fix, Hermes returns 200 but output says "HTTP 400: No models provided". Gateway is running but no model configured.
- **Diagnosis:** Gateway crash fix deleted `HERMES_DEFAULT_MODEL` and `HERMES_DEFAULT_PROVIDER` from Railway env vars. Provisioner had no fallback — `config.yaml` written without model/provider lines.
- **Fix:** Changed provisioner defaults to `model = serverEnv.HERMES_DEFAULT_MODEL || serverEnv.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash"`, `provider = serverEnv.HERMES_DEFAULT_PROVIDER || "openrouter"`. Added `OPENROUTER_MODEL` to `serverEnv` in index.js.
- **Files changed:** `backend/src/modules/hades/runtime/hermesProfileProvisioner.js`, `backend/src/modules/hades/index.js`
- **Tests:** 19/19 pass
- **Deployed:** railway up
- **Verification:** Message returns 200 with actual AI response and token counts. Model changeable via `$HERMES_DEFAULT_MODEL` or `$OPENROUTER_MODEL` env vars.

## Agent dev logs
- `additional-modules/work-log/dev-logs/agent/008_2026-06-20_dev-log-agent_hades-hermes-provider-model-config.json`
