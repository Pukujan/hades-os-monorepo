# Hermes Discovery

Hermes (Nous Research) agent documentation — findings from Railway production probe and codebase analysis.

## Files

| File | Format | Audience |
|------|--------|----------|
| `hermes-discovery.json` | JSON (structured) | Agents, tools, automated processing |
| `hermes-discovery.md` | Markdown (narrative) | Humans |
| `AGENT_CONTEXT.md` | Markdown | Coding agents working on Hades/Hermes integration |
| `upstream/llms.txt` | Markdown | Compact official Hermes docs index |
| `upstream/llms-full.txt` | Markdown | Full official Hermes docs corpus |
| `upstream/hermes-docs.agent.json` | JSON | Machine-readable upstream docs map plus Hades integration notes |
| `autonomous-hermes-cloud-study.md` | Markdown | Architecture study (in `backend/src/modules/hades/studies/`) |

## Quick Facts

- **Version:** v0.16.0 (2026.6.5)
- **Install:** `/opt/hermes-venv/bin/hermes` — pip install in Dockerfile
- **Python:** 3.11.2
- **Size:** 183MB
- **Container:** `node:22-slim` + Python via apt
- **Railway project:** virtuous-tranquility
- **Railway service:** hades-os-monorepo
- **Container resources:** 7.5GB RAM, 48 CPU cores
- **HF model default:** Nous Research Hermes 3

## Key Discovery

`hermes chat --query <prompt>` is the non-interactive single-query mode.
Replaces the undocumented `--oneshot` flag. Supports `--skills`, `--toolsets`,
`--resume`, `--checkpoints`, profile-based configuration.

## Upstream Docs Snapshot

The official Hermes docs expose machine-readable entry points for coding agents.
Local copies are stored in `docs/hermes/upstream/` so Hades development can work
even when the docs site changes or is temporarily unavailable.

For future Hermes/Hades architecture work, start with `AGENT_CONTEXT.md` and
`upstream/hermes-docs.agent.json` before loading the full `llms-full.txt`.
