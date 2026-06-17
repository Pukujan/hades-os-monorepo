# Handoff: Durable Workflow Run State And Recovery

**Date:** 2026-06-17
**Depends on:** `work-log/handoffs/009_2026-06-17_16-51_handoff_hermes-workflow-orchestrator.md`
**Primary TDD gate:**

```bash
npm run test:hades-workflow-durable-run-state
```

## Objective

Add durable state memory for long-running workflows so Hermes/Hades can pause, recover, and resume multi-step tasks without losing context or repeating completed work.

This is different from chat memory. Chat memory remembers user facts and conversation context. Durable workflow run state remembers what a specific workflow run already did, where it paused, what tool calls completed, what approvals are pending, and how to resume after a crash, deploy, timeout, or user return.

## Why This Matters

Long tasks like targeted job applications, browser form filling, calendar planning, research, document generation, and multi-agent orchestration may last minutes, hours, or days. They need:

- Checkpoints after each major step.
- Resume cursors for the next step.
- Tool-call idempotency.
- Approval pause/resume.
- Crash recovery.
- Stale-run detection.
- Human-readable next action.
- Strict user/tenant isolation.

## OpenCode Build Contract

Make this pass:

```bash
npm run test:hades-workflow-durable-run-state
```

Expected modules:

- `backend/src/modules/hades/workflows/workflowRunStateRepository.js`
- `backend/src/modules/hades/workflows/durableWorkflowOrchestrator.js`
- `backend/src/modules/hades/workflows/workflowRecoveryService.js`

## Required Behavior

### Run State Repository

Must support:

- `createRun({ userId, tenantId, workflowDefinitionId, input, idempotencyKey })`
- `appendCheckpoint({ runId, userId, tenantId, checkpoint })`
- `recoverRun({ runId, userId, tenantId })`
- `listStaleRuns({ olderThanMs, now })`
- `markRecoverable(run)`

Each run should track:

- `id`
- `user_id`
- `tenant_id`
- `workflow_definition_id`
- `status`: `queued`, `running`, `paused`, `approval_required`, `recoverable`, `completed`, `failed`, `cancelled`
- `input`
- `resume_cursor`
- `last_checkpoint`
- `completed_tool_call_ids`
- `pending_approval_ids`
- `retry_count`
- `idempotency_key`
- `created_at`
- `updated_at`

Checkpoints should track:

- `run_id`
- `stepId`
- `status`
- `cursor`
- `snapshot`
- `toolCallId`
- `approvalId`
- `error`
- `created_at`

### Durable Orchestrator

Must support:

- Starting a run and writing initial checkpoint.
- Writing checkpoint after each completed tool call.
- Pausing before approval-required actions.
- Resuming after approval.
- Skipping already completed tool calls on resume.
- Marking run completed only after all remaining planned steps finish.
- Never trusting caller-supplied user/tenant outside auth context.

### Recovery Service

Must support:

- Finding stale `running` runs.
- Marking them `recoverable`.
- Preserving retry metadata.
- Producing a human-readable `nextAction`, for example `Resume from generate_resume`.
- Avoiding duplicate recovery attempts beyond max retry policy.

## Non-Negotiables

- User A cannot recover or resume User B's run.
- A resumed run must not repeat already completed side-effecting tool calls.
- Approval-required actions must stay paused until approval is recorded.
- Run state must be durable enough for backend restart/deploy recovery.
- Clear chat must not clear workflow run state.

## Done Definition

- `npm run test:hades-workflow-durable-run-state` passes.
- Durable run state is integrated into future workflow routes before long tasks are exposed in UI.
- Handoff #009 should link to this handoff as part of runtime wiring.
