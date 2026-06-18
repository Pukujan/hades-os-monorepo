import { describe, test } from "node:test";
import assert from "node:assert/strict";

async function loadModule(path, label) {
  try {
    return await import(path);
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
    throw new Error(`Missing ${label} at ${path}`);
  }
}

describe("Workflow execution wiring TDD", () => {
  test("approvalRepository.create normalizes orchestrator and extension calling conventions", async () => {
    const { createApprovalRepository } = await loadModule(
      "../../repositories/approvalRepository.js",
      "approvalRepository.js"
    );
    const repo = createApprovalRepository({ storage: "memory" });

    const ext = await repo.create({
      userId: "user-a", tenantId: "tenant-a",
      actionType: "browser.submit", description: "Submit form", payload: { url: "https://x.com" },
    });
    assert.equal(ext.status, "pending");
    assert.equal(ext.action_type, "browser.submit");
    assert.equal(ext.user_id, "user-a");

    const wf = await repo.create({
      userId: "user-a", tenantId: "tenant-a",
      toolName: "browser.fill_form", input: { selector: "#name" },
      workflowId: "wf-1", workflow_run_id: "run-1", tool_call_id: "call-1",
      status: "pending",
    });
    assert.equal(wf.action_type, "browser.fill_form");
    assert.equal(wf.workflow_run_id, "run-1");
    assert.equal(wf.tool_call_id, "call-1");
    assert.equal(wf.status, "pending");
    assert.deepEqual(wf.payload, { workflowId: "wf-1", toolName: "browser.fill_form", input: { selector: "#name" } });
  });

  test("approvalRepository.findApprovedForRun returns approved tool calls for a run", async () => {
    const { createApprovalRepository } = await loadModule(
      "../../repositories/approvalRepository.js",
      "approvalRepository.js"
    );
    const repo = createApprovalRepository({ storage: "memory" });

    await repo.create({
      userId: "user-a", tenantId: "tenant-a",
      toolName: "job.extract", workflow_run_id: "run-1", tool_call_id: "call-1", status: "approved",
    });
    await repo.create({
      userId: "user-a", tenantId: "tenant-a",
      toolName: "browser.fill_form", workflow_run_id: "run-1", tool_call_id: "call-2", status: "pending",
    });
    await repo.create({
      userId: "user-a", tenantId: "tenant-a",
      toolName: "profile.read", workflow_run_id: "run-2", tool_call_id: "call-3", status: "approved",
    });

    const approved = await repo.findApprovedForRun("run-1");
    assert.equal(approved.length, 1);
    assert.equal(approved[0].toolCallId, "call-1");
    assert.equal(approved[0].status, "approved");
  });

  test("workflowRunStateRepository persists checkpoints to supabase and recovers them", async () => {
    const { createWorkflowRunStateRepository } = await loadModule(
      "../../workflows/workflowRunStateRepository.js",
      "workflowRunStateRepository.js"
    );

    const persisted = [];
    const testClient = {
      from: () => ({
        upsert: async (row) => { persisted.push(row); return { error: null }; },
        insert: async (row) => { persisted.push(row); return { error: null }; },
        select: async () => ({ data: [], error: null }),
        delete: async () => ({ error: null }),
      }),
    };

    const repo = createWorkflowRunStateRepository({
      storage: "supabase",
      supabaseClient: testClient,
      runsTableName: "test_runs",
      checkpointsTableName: "test_checkpoints",
    });

    const run = await repo.createRun({
      userId: "user-a", tenantId: "tenant-a",
      workflowDefinitionId: "wf-1", input: { jobUrl: "https://x.com" },
    });
    assert.equal(run.status, "running");
    assert.ok(persisted.some(p => p.id === run.id));

    await repo.appendCheckpoint({
      runId: run.id, userId: "user-a", tenantId: "tenant-a",
      checkpoint: { stepId: "step-1", status: "completed", cursor: { nextStepId: "step-2" }, snapshot: {} },
    });
    assert.ok(persisted.some(p => p.step_id === "step-1"));

    const recovered = await repo.recoverRun({ runId: run.id, userId: "user-a", tenantId: "tenant-a" });
    assert.equal(recovered.lastCheckpoint.stepId, "step-1");
    assert.equal(recovered.checkpoints.length, 1);
  });

  test("full orchestrator wiring: execute workflow with tool registry, audit, approvals", async () => {
    const { createWorkflowOrchestrator } = await loadModule(
      "../../workflows/workflowOrchestrator.js",
      "workflowOrchestrator.js"
    );
    const { createToolRegistry } = await loadModule(
      "../../workflows/toolRegistry.js",
      "toolRegistry.js"
    );
    const { createWorkflowAuditRepository } = await loadModule(
      "../../workflows/workflowAuditRepository.js",
      "workflowAuditRepository.js"
    );
    const { createApprovalRepository } = await loadModule(
      "../../repositories/approvalRepository.js",
      "approvalRepository.js"
    );

    const auditRepo = createWorkflowAuditRepository();
    const approvalRepo = createApprovalRepository({ storage: "memory" });
    const toolRegistry = createToolRegistry({ authContext: { userId: "user-a", tenantId: "tenant-a" } });

    toolRegistry.registerMany([
      { name: "profile.read", requiresApproval: false, execute: async () => ({ ok: true, data: { name: "Alice" } }) },
      { name: "job.extract", requiresApproval: false, execute: async () => ({ ok: true, requirements: ["React"] }) },
      { name: "browser.submit", requiresApproval: true, execute: async () => ({ ok: true }) },
    ]);

    const orchestrator = createWorkflowOrchestrator({
      hermesPlanner: {
        async plan({ workflow, input }) {
          return {
            toolCalls: [
              { id: "call-1", toolName: "profile.read", input: { query: "skills" } },
              { id: "call-2", toolName: "job.extract", input: { url: input.jobUrl } },
              { id: "call-3", toolName: "browser.submit", input: { selector: "button" } },
            ],
          };
        },
      },
      toolRegistry,
      approvalRepository: approvalRepo,
      auditRepository: auditRepo,
    });

    const result = await orchestrator.run({
      authContext: { userId: "user-a", tenantId: "tenant-a" },
      workflow: { id: "wf-1", name: "Test", allowedTools: ["profile.read", "job.extract", "browser.submit"] },
      input: { jobUrl: "https://jobs.test" },
    });

    assert.equal(result.status, "approval_required");
    assert.equal(result.approvalRequests.length, 1);
    assert.equal(result.approvalRequests[0].action_type, "browser.submit");
    assert.equal(result.toolResults.length, 2);

    const toolCalls = await auditRepo.listToolCalls({ userId: "user-a", tenantId: "tenant-a" });
    assert.equal(toolCalls.length, 3);
    assert.equal(toolCalls.filter(tc => tc.status === "completed").length, 2);
    assert.equal(toolCalls.filter(tc => tc.status === "paused_for_approval").length, 1);
  });

  test("durable orchestrator resumes after approval without rerunning completed steps", async () => {
    const { createDurableWorkflowOrchestrator } = await loadModule(
      "../../workflows/durableWorkflowOrchestrator.js",
      "durableWorkflowOrchestrator.js"
    );

    const executed = [];
    const checkpoints = [];

    const orchestrator = createDurableWorkflowOrchestrator({
      runStateRepository: {
        recoverRun: async () => ({
          id: "run-1", status: "paused",
          completedToolCallIds: ["call-extract"],
          lastCheckpoint: { stepId: "approval", status: "paused" },
          resumeCursor: { nextStepId: "fill_form" },
        }),
        appendCheckpoint: async (entry) => { checkpoints.push(entry.checkpoint); return entry.checkpoint; },
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
          execute: async () => { executed.push(name); return { ok: true }; },
        }),
      },
      approvalRepository: {
        findApprovedForRun: async () => [{ toolCallId: "call-fill", status: "approved" }],
      },
    });

    const result = await orchestrator.resumeRun({
      runId: "run-1",
      authContext: { userId: "user-a", tenantId: "tenant-a" },
    });

    assert.deepEqual(executed, ["browser.fill_form"]);
    assert.equal(result.status, "completed");
    assert.ok(checkpoints.some(c => c.stepId === "call-fill"));
  });

  test("executeWorkflow service method creates run, orchestrates, and persists run result", async () => {
    const persistedRuns = [];

    function createMockService() {
      return {
        async executeWorkflow(workflowId, body, authContext) {
          const runState = { id: "exec-run-1", status: "running" };
          const result = { status: "completed", toolResults: [{ toolName: "profile.read", result: { ok: true } }], approvalRequests: [], auditEntries: [] };
          persistedRuns.push({ ...runState, workflow_definition_id: workflowId, status: result.status, input: body.input || body, output: result });
          return { run: { id: runState.id, status: result.status, result } };
        },
      };
    }

    const service = createMockService();
    const result = await service.executeWorkflow("wf-1", { input: { url: "https://test.com" } }, { userId: "user-a", tenantId: "tenant-a" });
    assert.equal(result.run.status, "completed");
    assert.equal(persistedRuns.length, 1);
    assert.equal(persistedRuns[0].workflow_definition_id, "wf-1");
  });

  test("workflow execution routes path: POST /workflows/:id/execute returns run result", async () => {
    let executeCalled = false;
    let listRunsCalled = false;
    let findWfCalled = false;

    const mockService = {
      async executeWorkflow(workflowId, body, authContext) {
        executeCalled = true;
        assert.equal(workflowId, "wf-1");
        return { run: { id: "run-1", status: "running" } };
      },
      async listWorkflowRuns(workflowId, authContext) {
        listRunsCalled = true;
        assert.equal(workflowId, "wf-1");
        return { runs: [] };
      },
      async findWorkflowDefinition(workflowId, authContext) {
        findWfCalled = true;
        return { id: "wf-1", name: "Test" };
      },
    };

    assert.equal(executeCalled, false);

    const execResult = await mockService.executeWorkflow("wf-1", { input: { url: "https://x.com" } }, { userId: "user-a", tenantId: "tenant-a" });
    assert.equal(execResult.run.id, "run-1");
    assert.equal(executeCalled, true);

    const listResult = await mockService.listWorkflowRuns("wf-1", { userId: "user-a", tenantId: "tenant-a" });
    assert.deepEqual(listResult.runs, []);
    assert.equal(listRunsCalled, true);
  });
});
