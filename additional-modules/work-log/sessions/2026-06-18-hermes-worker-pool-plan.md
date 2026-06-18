# Plan — Hermes Dynamic Worker Pool

**Date:** 2026-06-18
**Module:** `hermes-worker-pool`
**Status:** Planned

## Architecture

New file `backend/src/modules/hades/services/hermesWorkerPool.service.js` replaces `runCommand` in `hermesRuntime.service.js`. Pool manager wraps `hermesRuntime.buildCommandArgs()` — no behavioral change to spawned binary.

### Env-var config

| Variable | Default | Purpose |
|---|---|---|
| `HERMES_POOL_MODE` | `warm` | `warm` \| `auto` \| `cold` |
| `HERMES_POOL_MIN` | `0` | Warm workers kept idle |
| `HERMES_POOL_MAX` | `20` | Hard ceiling |
| `HERMES_POOL_IDLE_MS` | `300000` | Kill after 5min idle |
| `HERMES_POOL_SCALE_DOWN` | `0.3` | Free mem ratio to trigger scale-down |
| `HERMES_POOL_SCALE_UP` | `0.7` | Used mem ratio to trigger scale-up |

### Mode behavior

- **`warm`** — keep `HERMES_POOL_MIN` workers alive always, spawn on demand up to `HERMES_POOL_MAX`, kill idle after timeout
- **`auto`** — watch `/proc/meminfo`, queue depth, request latency; spawn when used mem > 70%, kill idle when free mem < 30%
- **`cold`** — spawn per request, kill after `HERMES_POOL_IDLE_MS`

### Per-user cap

`Map<userId, processHandle>` in pool manager — never spawn a second Hermes for the same user if one is alive.

## Priority tasks

| Pri | Task | Status |
|---|---|---|
| High | Migrate `buildCommandArgs` from `--oneshot` to `chat --query -Q` | Planned |
| High | Measure active LLM call memory (vs idle 140 MB) | Planned |
| Med | Test `--resume` session restore from state.db | Planned |
| Med | Probe if `/data/` survives Railway deploys | Planned |
| Low | Test `--skills` flag and `--toolset` customization | Planned |
| Low | 5 quick fixes (typing indicator, timeout, queue, rate limiter, SSE) | Planned |

## Files changed

- `ADD` `backend/src/modules/hades/services/hermesWorkerPool.service.js`
- `EDIT` `backend/src/modules/hades/services/hermesRuntime.service.js` (wire pool as default `runCommand`)
- `EDIT` `backend/src/modules/hades/config/index.js` (add pool env-vars)
- `ADD` `backend/src/modules/hades/tests/unit/hermesWorkerPool.service.test.js` (TDD: red first)
- `ADD` `backend/src/modules/hades/tests/unit/hermesWorkerPool.contract.test.js`

## Lint gate

Pre-transition: `python3 additional-modules/scripts/check_gate.py --module hermes-worker-pool`
