# Contract: async job queue

**Version:** `v001`  
**Code:** `backend/src/shared/contracts/asyncJobQueue.contract.js`  
**Implementation guide:** [templates/async-job-queue/README.md](../templates/async-job-queue/README.md)

## Purpose

Durable **background work** for parse jobs, LLM calls, agent action steps, and retries — without Kafka or an in-process-only queue.

This contract applies to [documentPersistence](./documentPersistence.contract.md) (parse after upload) and [moduleAgentStateMachine](./moduleAgentStateMachine.contract.md) (long-running agent actions).

## Recommended stack (free)

| Layer | Tool | Role |
|-------|------|------|
| **Job queue** | **[BullMQ](https://docs.bullmq.io/)** (MIT, free) | Enqueue, workers, retries, delays, concurrency |
| **Queue backend** | **[Redis](https://redis.io/)** OSS (free) | Storage BullMQ uses for jobs — **required by BullMQ** |
| **Prolonged state** | **Postgres or SQLite** (`DATABASE_URL`) | Documents, agent runs, audit — **not** Redis |

### Is BullMQ free?

**Yes.** BullMQ is open source (MIT). No license fee. You run it yourself.

### Should we use Redis instead of BullMQ?

**No — they solve different problems:**

| | Redis alone | BullMQ + Redis |
|---|-------------|----------------|
| Cost | Free (OSS) | Free (OSS) |
| Async job queue with retries | Build yourself | Built in |
| Prolonged agent/document state | Wrong tool | Still use **SQL**, not Redis |
| Pub/sub notifications | Yes (ephemeral) | Optional; not a job queue |

**Use Redis as BullMQ's backend, not as a replacement for BullMQ or SQL.**

Redis pub/sub alone is fire-and-forget — if no worker is listening, the job is lost. BullMQ persists jobs in Redis until a worker completes them (with AOF/RDB persistence enabled on Redis for durability across restarts).

### Alternative (Postgres-only, no Redis)

If you want **one database** and minimal infra, [pg-boss](https://github.com/timgit/pg-boss) is acceptable. Document the swap in your module README. **Default for this platform contract: BullMQ + Redis.**

## Division of responsibility

```text
HTTP upload / start agent
        │
        ▼
   SQL commit (source of truth)
        │
        ▼
   BullMQ enqueue  ──►  Worker process
        │                    │
        │                    ▼
        │              Update SQL + emit eventBus
        ▼
   Return 202 / runId immediately
```

| Store | Holds |
|-------|--------|
| **SQL** | `documents`, `agent_runs`, final statuses, audit history |
| **BullMQ (Redis)** | Pending/running/failed **jobs** until worker finishes |
| **eventBus** | Same-process reactions after worker commits SQL |

**Never** store authoritative document or agent state only in Redis.

## Standard queue names

Use `{module}.{verb}` — registered in `asyncJobQueue.contract.js`:

| Queue | Producer | Worker responsibility |
|-------|----------|------------------------|
| `documents.parse` | document upload service | Parse file → write `document_text_versions` → emit `document.parsed` |
| `agents.run-action` | agent-runner service | Run one FSM action (LLM/tool) → `agentRunner.send(event)` |

Modules may add `{module}.{verb}` queues; append to the contract JS `STANDARD_QUEUES` when stabilised.

## Job payload shape (minimum)

```json
{
  "jobType": "documents.parse",
  "module": "documents",
  "correlationId": "uuid",
  "payload": { "documentId": "..." }
}
```

For agent jobs, include `runId`, `agentId`, and `action` when enqueueing from `agent-actions.js`.

## Environment

| Variable | Purpose |
|----------|---------|
| `REDIS_URL` | BullMQ connection (e.g. `redis://127.0.0.1:6379`) |
| `DATABASE_URL` | SQL — required alongside queue for durable state |

Local dev: Redis via Docker (`redis:7-alpine`) or Homebrew. Skip queue in tests — call services directly or use an in-memory queue adapter.

## Worker layout

```text
backend/src/shared/queue/
├── createQueueConnection.js     ← REDIS_URL
├── registerWorkers.js           ← starts BullMQ workers at boot (optional flag)
└── inMemoryQueue.adapter.js     ← test/dev stub

backend/src/modules/<module>/
└── workers/
    └── parse-document.worker.js ← module-specific processor
```

Workers live in the **owning module**; shared code only provides connection helpers.

## Retry and failure

| Setting | Default |
|---------|---------|
| Attempts | 3 |
| Backoff | exponential, 5s base |
| On final failure | Update SQL status (`failed`) + emit `document.parse_failed` or `agent.run.failed` |

FSM transitions happen **after** worker success — worker calls `agentRunner.send()`, not the other way around.

## When **not** to use the queue

| Case | Use instead |
|------|-------------|
| Health checks, sync reads | Direct service call |
| Unit tests | In-memory adapter or direct service |
| Same-request work under ~500ms | Inline in service (optional) |

## Implementation checklist

1. Add `REDIS_URL` and run Redis locally or in Docker.
2. Install when implementing: `npm install bullmq ioredis --prefix backend`
3. Copy templates from [templates/async-job-queue/](../templates/async-job-queue/README.md).
4. Enqueue after SQL commit in document ingest / agent-runner.
5. Worker updates SQL then emits `eventBus` events.
6. Run `npm run lint:architecture` and `npm run test:ci`.

## Related contracts

- [documentPersistence.contract.md](./documentPersistence.contract.md)
- [moduleAgentStateMachine.contract.md](./moduleAgentStateMachine.contract.md)
- [ARCHITECTURE_GUARDRAILS.md](../ARCHITECTURE_GUARDRAILS.md)
