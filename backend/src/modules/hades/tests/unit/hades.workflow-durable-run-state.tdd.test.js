import assert from "node:assert/strict";
import { describe, test } from "node:test";

async function loadModule(path, message) {
  try {
    return await import(path);
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND") {
      throw error;
    }
    throw new Error(message);
  }
}

describe("Hades durable workflow run state TDD contract", () => {
  test("run state repository persists checkpoints and recovers resumable runs by user and tenant", async () => {
    const { createWorkflowRunStateRepository } = await loadModule(
      "../../workflows/workflowRunStateRepository.js",
      "Missing workflowRunStateRepository.js. Expected durable checkpoints for long-running workflow recovery.",
    );

    const repository = createWorkflowRunStateRepository({ storage: "memory" });

    const run = await repository.createRun({
      userId: "user-a",
      tenantId: "tenant-a",
      workflowDefinitionId: "wf-apply",
      input: { jobUrl: "https://jobs.example.test/apply" },
      idempotencyKey: "run-key-1",
    });

    await repository.appendCheckpoint({
      runId: run.id,
      userId: "user-a",
      tenantId: "tenant-a",
      checkpoint: {
        stepId: "extract_requirements",
        status: "completed",
        cursor: { nextStepId: "match_resume" },
        snapshot: { requirements: ["React", "Playwright"] },
      },
    });

    await repository.appendCheckpoint({
      runId: run.id,
      userId: "user-a",
      tenantId: "tenant-a",
      checkpoint: {
        stepId: "match_resume",
        status: "paused",
        pauseReason: "approval_required",
        cursor: { nextStepId: "fill_form" },
        snapshot: { matchedFacts: ["Built React apps"] },
      },
    });

    const recovered = await repository.recoverRun({
      runId: run.id,
      userId: "user-a",
      tenantId: "tenant-a",
    });

    assert.equal(recovered.status, "paused");
    assert.equal(recovered.lastCheckpoint.stepId, "match_resume");
    assert.deepEqual(recovered.resumeCursor, { nextStepId: "fill_form" });
    assert.equal(recovered.checkpoints.length, 2);

    const forbidden = await repository.recoverRun({
      runId: run.id,
      userId: "user-b",
      tenantId: "tenant-b",
    });
    assert.equal(forbidden, null);
  });

  test("durable orchestrator resumes after approval without rerunning completed tool calls", async () => {
    const { createDurableWorkflowOrchestrator } = await loadModule(
      "../../workflows/durableWorkflowOrchestrator.js",
      "Missing durableWorkflowOrchestrator.js. Expected resumable long-running orchestration with checkpointed tool calls.",
    );

    const executed = [];
    const checkpoints = [];
    const orchestrator = createDurableWorkflowOrchestrator({
      runStateRepository: {
        createRun: async (run) => ({ id: "run-1", status: "running", ...run }),
        appendCheckpoint: async (entry) => {
          checkpoints.push(entry.checkpoint);
          return entry.checkpoint;
        },
        recoverRun: async () => ({
          id: "run-1",
          status: "paused",
          completedToolCallIds: ["call-extract"],
          resumeCursor: { nextStepId: "fill_form" },
          lastCheckpoint: { stepId: "approval", status: "paused" },
        }),
      },
      planner: {
        plan: async () => ({
          toolCalls: [
            { id: "call-extract", toolName: "job.extract", input: {} },
            { id: "call-fill", toolName: "browser.fill_form", input: {} },
          ],
        }),
      },
      toolRegistry: {
        get: (name) => ({
          name,
          requiresApproval: name === "browser.fill_form",
          execute: async () => {
            executed.push(name);
            return { ok: true };
          },
        }),
      },
      approvalRepository: {
        findApprovedForRun: async () => [{ toolCallId: "call-fill", status: "approved" }],
        create: async () => ({ id: "approval-1", status: "pending" }),
      },
    });

    const result = await orchestrator.resumeRun({
      runId: "run-1",
      authContext: { userId: "user-a", tenantId: "tenant-a" },
    });

    assert.deepEqual(executed, ["browser.fill_form"]);
    assert.equal(result.status, "completed");
    assert.ok(checkpoints.some((checkpoint) => checkpoint.stepId === "call-fill"));
  });

  test("stale running runs are recoverable with retry metadata and human-readable next action", async () => {
    const { createWorkflowRecoveryService } = await loadModule(
      "../../workflows/workflowRecoveryService.js",
      "Missing workflowRecoveryService.js. Expected stale-run recovery and retry planning for long tasks.",
    );

    const service = createWorkflowRecoveryService({
      runStateRepository: {
        listStaleRuns: async () => [
          {
            id: "run-stale",
            user_id: "user-a",
            tenant_id: "tenant-a",
            status: "running",
            updated_at: "2026-06-17T10:00:00.000Z",
            last_checkpoint: { stepId: "generate_resume", status: "running" },
            retry_count: 1,
          },
        ],
        markRecoverable: async (run) => ({
          ...run,
          status: "recoverable",
          nextAction: "Resume from generate_resume",
        }),
      },
    });

    const recovered = await service.markStaleRunsRecoverable({
      olderThanMs: 15 * 60 * 1000,
      now: new Date("2026-06-17T10:30:00.000Z"),
    });

    assert.equal(recovered.length, 1);
    assert.equal(recovered[0].status, "recoverable");
    assert.equal(recovered[0].nextAction, "Resume from generate_resume");
    assert.equal(recovered[0].retry_count, 1);
  });
});
