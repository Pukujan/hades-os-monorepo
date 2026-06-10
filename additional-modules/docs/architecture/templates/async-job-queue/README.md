# Async job queue — implementation guide

Spec: [asyncJobQueue.contract.md](../../contracts/asyncJobQueue.contract.md)

## Stack (free)

- **BullMQ** — job queue (MIT license, no cost)
- **Redis** — required backend for BullMQ (Redis OSS, free)
- **Postgres/SQLite** — durable document + agent state (not Redis)

Redis alone is **not** a substitute for BullMQ or SQL.

## Quick start (when implementing)

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
echo 'REDIS_URL=redis://127.0.0.1:6379' >> backend/.env
npm install bullmq ioredis --prefix backend
```

Copy `*.template.js` files into `backend/src/shared/queue/` and module `workers/`.

## Templates

| File | Purpose |
|------|---------|
| `createQueueConnection.template.js` | Redis connection from `REDIS_URL` |
| `enqueue.template.js` | Add job after SQL commit |
| `parse-document.worker.template.js` | Document parse worker |
| `run-agent-action.worker.template.js` | Agent FSM action worker |

## Wiring

1. **Upload route** → save SQL → `enqueue(STANDARD_QUEUES.DOCUMENTS_PARSE, { documentId })` → return `202`
2. **Worker** → parse → update SQL → `eventBus.emit('document.parsed', …)`
3. **Agent action** → enqueue `agents.run-action` instead of blocking HTTP
4. **Worker** → run action → `agentRunner.send(runId, eventType, payload)`

## Postgres-only alternative

Replace BullMQ with [pg-boss](https://github.com/timgit/pg-boss) if you refuse to run Redis. Update your module README; keep SQL as source of truth.

## Local dev without Redis

Use `inMemoryQueue.adapter.template.js` in tests or set `QUEUE_DISABLED=true` and call services inline (document in module config).
