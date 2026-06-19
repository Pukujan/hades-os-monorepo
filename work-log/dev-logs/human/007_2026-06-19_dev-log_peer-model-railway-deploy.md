# Dev Log — Peer-Model Railway Deploy

## Hash: 1b3be75
## Branch: master
## Date: 2026-06-19

## Summary

Pushed 239 files — the entire peer-model docker proof backend infrastructure, Hermes docs cache, lvh.me DNS migration, and frontend patch notes. Railway has a successful deploy at commit 5fe8e4f (old, pre-peer-model). Need to trigger a new deploy so Railway picks up 1b3be75.

## What's in the Push

### New Runtime Modules (6)
- hermesProfileRegistry.js — in-memory profile map
- hermesProfileRouter.js — public edge URL + private loopback target
- hermesProfileProvisioner.js — creates profile dirs on disk, allocates port
- hermesProfileStatePersistence.js — snapshots profile to object store
- hermesProfileSessionBroker.js — JWT verification -> session -> routing token
- hermesEdgeAuthProxy.js — token validation, auth injection, upstream proxy

### New Routes (8)
- POST /sessions — bootstrap session, returns edge URL + routing token
- GET /proof/profile — admin profile inspection
- POST /proof/snapshot — admin profile snapshot
- POST /proof/restart — admin restart trigger
- GET /:profileName/v1/* — edge proxy catch-all
- POST /:profileName/v1/* — edge proxy catch-all
- GET /state-index — persistent state markers
- POST /state-index — store state marker

### Infrastructure Changes
- docker-compose.yaml: HERMES_PUBLIC_BASE_URL=http://lvh.me:3001/api/hades/hermes
- backend/.env.docker: same URL (gitignored)
- AGENTS.md: section 11 — Hermes-docs-first rule
- .gitignore: exclude backend/.env.docker

### Docs
- docs/hermes-agent/: 171 pages from upstream llms-full.txt
- docs/hades/PEER_MODEL_FRONTEND_PATCH_NOTES.md: full integration guide for next agent

### Tests
- scripts/hades-hermes-peer-docker-proof.e2e.test.mjs — 5/5 all green

## Railway Status

- Project: virtuous-tranquility
- Service: hades-os-monorepo
- Latest deploy: SUCCESS at 5fe8e4f (Jun 18) — pre-peer-model
- Railway root: backend/
- Builder: DOCKERFILE
- Deploy needs manual trigger or push to master

## Known Gaps (from patch notes)

1. Edge auth uses proof token — needs routing token validation
2. Profile Hermes API server not launched — edge returns fallback
3. No profile management routes (soul, config, env GET/PUT)
4. Frontend still calls /chat/general, not session->edge URL

## Next

Trigger Railway deploy from this commit. Verify the 5 proof tests pass against Railway URL.
