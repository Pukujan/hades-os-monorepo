# Modular Monolith Starter

Agent-first Express + React scaffold with architecture contracts, module boundaries, file-exchange, dev logs, and CI lint gates.

## Stack

| Layer | Tech |
| --- | --- |
| Backend | Express, modular loader |
| Frontend | React + Vite, registry-driven module routes |
| Contracts | 9 registered IDs — [CONTRACTS_OVERVIEW](docs/architecture/CONTRACTS_OVERVIEW.md) |

## Quick start

```bash
npm install --prefix backend && npm install --prefix frontend

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Backend `.env` is also the source of truth for Hermes/OpenRouter sync.

# Finish context engineering (safe to re-run on pre-shipped scaffold)
node additional-modules/context-engineering/bin/context-eng.js init --phase-builder --opencode
python3 additional-modules/scripts/measure_context.py --tokens 0 --start-session
python3 additional-modules/scripts/render_memory.py

npm run test:ci
```

Run API + UI:

```bash
cd backend && npm run dev    # http://localhost:3001
cd frontend && npm run dev   # http://localhost:5173
```

## Add a module

```bash
npm run new:module -- billing --label "Billing"
```

## Docs

| Doc | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Required for Cursor / automation |
| [docs/architecture/CONTRACTS_OVERVIEW.md](docs/architecture/CONTRACTS_OVERVIEW.md) | Contract manifest |
| [docs/API.md](docs/API.md) | HTTP endpoint registry |

## License

MIT — Copyright (c) 2026 Pukujan. See [LICENSE](LICENSE).
