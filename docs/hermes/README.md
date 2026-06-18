# Hermes Discovery

Hermes (Nous Research) agent documentation — findings from Railway production probe and codebase analysis.

## Files

| File | Format | Audience |
|------|--------|----------|
| `hermes-discovery.json` | JSON (structured) | Agents, tools, automated processing |
| `hermes-discovery.md` | Markdown (narrative) | Humans |
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
