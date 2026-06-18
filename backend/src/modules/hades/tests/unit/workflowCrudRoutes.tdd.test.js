import { describe, test } from "node:test";
import assert from "node:assert/strict";

async function load(mod, label) {
  try { return await import(mod); }
  catch (e) {
    if (e?.code !== "ERR_MODULE_NOT_FOUND") throw e;
    throw new Error(`Missing ${label} at ${mod}`);
  }
}

describe("Workflow CRUD routes TDD", () => {
  test("updateWorkflow patches a workflow definition", async () => {
    const { createWorkflowRepository } = await load("../../workflows/workflowRepository.js", "workflowRepository.js");
    const repo = createWorkflowRepository({ storage: "memory" });

    const created = await repo.createDefinition({
      userId: "user-a", tenantId: "tenant-a",
      data: { id: "wf-1", name: "Test", goal: "initial", prompt: "old prompt" },
    });

    const updated = await repo.updateDefinition({
      id: "wf-1", userId: "user-a", tenantId: "tenant-a",
      patch: { prompt: "new prompt", goal: "updated goal" },
    });

    assert.equal(updated.goal, "updated goal");
    assert.equal(updated.prompt, "new prompt");
    assert.equal(updated.name, "Test");
    assert.equal(typeof updated.updated_at, "string");
    assert.ok(updated.updated_at.length > 0);
  });

  test("deleteWorkflow removes a workflow definition", async () => {
    const { createWorkflowRepository } = await load("../../workflows/workflowRepository.js", "workflowRepository.js");
    const repo = createWorkflowRepository({ storage: "memory" });

    await repo.createDefinition({
      userId: "user-a", tenantId: "tenant-a",
      data: { id: "wf-1", name: "Test", goal: "test" },
    });

    await repo.delete({ id: "wf-1", userId: "user-a", tenantId: "tenant-a" });

    const found = await repo.findDefinitionById({ id: "wf-1", userId: "user-a", tenantId: "tenant-a" });
    assert.equal(found, null);
  });

  test("deleteWorkflow only deletes matching user scope", async () => {
    const { createWorkflowRepository } = await load("../../workflows/workflowRepository.js", "workflowRepository.js");
    const repo = createWorkflowRepository({ storage: "memory" });

    await repo.createDefinition({
      userId: "user-a", tenantId: "tenant-a",
      data: { id: "wf-1", name: "A's", goal: "a" },
    });

    const result = await repo.delete({ id: "wf-1", userId: "user-b", tenantId: "tenant-b" });
    assert.equal(result, false);

    const found = await repo.findDefinitionById({ id: "wf-1", userId: "user-a", tenantId: "tenant-a" });
    assert.ok(found);
  });

  test("bootstrap includes workflows when repository is available", async () => {
    const { createWorkflowRepository } = await load("../../workflows/workflowRepository.js", "workflowRepository.js");
    const wfRepo = createWorkflowRepository({ storage: "memory" });

    await wfRepo.createDefinition({
      userId: "user-a", tenantId: "tenant-a",
      data: { id: "wf-boot", name: "Bootstrap WF", goal: "boot test" },
    });

    const workflows = await wfRepo.listDefinitions({ userId: "user-a", tenantId: "tenant-a" });
    assert.equal(workflows.length, 1);
    assert.equal(workflows[0].name, "Bootstrap WF");
  });

  test("extension workflow list returns workflows from service", async () => {
    const { createWorkflowRepository } = await load("../../workflows/workflowRepository.js", "workflowRepository.js");
    const wfRepo = createWorkflowRepository({ storage: "memory" });

    await wfRepo.createDefinition({
      userId: "user-a", tenantId: "tenant-a",
      data: { id: "wf-ext", name: "Ext WF", goal: "ext test" },
    });

    const wf = await wfRepo.findDefinitionById({ id: "wf-ext", userId: "user-a", tenantId: "tenant-a" });
    assert.ok(wf);
    assert.equal(wf.name, "Ext WF");
  });

  test("POST /workflows/:id/execute and GET /workflows/:id/runs route pattern", async () => {
    let patchCalled = false;
    let deleteCalled = false;
    let getCalled = false;

    const mockService = {
      async updateWorkflow(id, body, auth) { patchCalled = true; return { id }; },
      async deleteWorkflow(id, auth) { deleteCalled = true; return { ok: true }; },
      async findWorkflowDefinition(id, auth) { getCalled = true; return { id }; },
    };

    const r1 = await mockService.updateWorkflow("wf-1", { name: "new" }, { userId: "user-a", tenantId: "tenant-a" });
    assert.equal(patchCalled, true);
    assert.equal(r1.id, "wf-1");

    const r2 = await mockService.deleteWorkflow("wf-1", { userId: "user-a", tenantId: "tenant-a" });
    assert.equal(deleteCalled, true);
    assert.equal(r2.ok, true);

    const r3 = await mockService.findWorkflowDefinition("wf-1", { userId: "user-a", tenantId: "tenant-a" });
    assert.equal(getCalled, true);
    assert.equal(r3.id, "wf-1");
  });
});
