# Hermes Discovery Docs — Maintenance Guide

## Purpose

The `docs/hermes/` directory tracks all discoveries about the Hermes agent
from Railway production probes, codebase analysis, and CLI exploration.

## Files

| File | Format | Audience | Update When |
|------|--------|----------|-------------|
| `README.md` | Markdown | Humans | New Hermes version or major discovery |
| `hermes-discovery.json` | JSON (structured) | Agents, tools | **Every** new discovery, flag, subcommand, or env var |
| `hermes-discovery.md` | Markdown (narrative) | Humans | Significant findings worth prose explanation |
| `MAINTENANCE.md` | Markdown | Humans | This file — rarely changed |

## Update Rules

1. **Every Railway probe session** must update `hermes-discovery.json` with any
   new findings before the session ends.

2. **`hermes-discovery.json` is the source of truth** for agents. Keep fields
   typed (boolean, string, array where appropriate) and dated.

3. **`hermes-discovery.md` mirrors the JSON** but adds narrative context, code
   snippets, and discovery stories.

4. When confirming a previously-unknown answer, move it from `open_questions`
   to `confirmed_findings` in the JSON, and add a ✅-prefixed section in the
   MD file.

5. Bump `schema_version` in the JSON when the structure changes significantly.

## Enforcer

A test at `backend/src/modules/hades/__tests__/hermesDiscoveryDocs.ops.test.js`
validates that all files exist, the JSON is well-formed, and required fields
are populated. Run with:

```bash
npm --prefix backend test -- --test-reporter spec --test-name-pattern "hermes discovery"
```

Or by direct path:

```bash
node --test backend/src/modules/hades/__tests__/hermesDiscoveryDocs.ops.test.js
```

This test runs automatically as part of `node --test` discovery in the
backend package.

## Workflow

When making new Hermes discoveries (e.g., during Railway SSH probes):

1. Run the probe command, capture output
2. Update `hermes-discovery.json`:
   - Add new subcommands to `subcommands.{name}`
   - Confirm/answer `open_questions` → move to `confirmed_findings`
   - Update `last_updated` timestamp
3. Update `hermes-discovery.md`:
   - Add ✅-prefixed confirmed findings
   - Update tables and code blocks
4. Run the ops test to verify everything is consistent
