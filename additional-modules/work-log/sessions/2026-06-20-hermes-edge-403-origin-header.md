# Session archive - 2026-06-20-hermes-edge-403-origin-header

- **Archived:** 2026-06-20T06:01:44.564+00:00
- **Peak usage:** 0 tokens
- **Budget file:** `additional-modules/buildplan/context_budget.json`

## What happened

- **Bug:** Browser POST to `/v1/responses` returned 403 with empty body (`x-powered-by: Express`). CLI worked fine with same token/body.
- **Diagnosis:** Edge proxy (`hermesEdgeAuthProxy.js`) forwarded `Origin`, `Referer`, `sec-*` browser headers to Hermes gateway. Hermes rejected cross-origin `Origin` header with 403.
- **Fix:** Added header stripping in `forward()` — delete `origin`, `Origin`, `referer`, `Referer`, and any `sec-*`/`Sec-*` prefixed headers before forwarding.
- **Files changed:** `backend/src/modules/hades/runtime/hermesEdgeAuthProxy.js`
- **Tests:** 19/19 pass
- **Deployed:** railway up
- **Verification:** Full browser header set → 200 with completed response

## Agent dev logs
- `additional-modules/work-log/dev-logs/agent/007_2026-06-20_dev-log-agent_hades-hermes-edge-403-header-strip.json`
