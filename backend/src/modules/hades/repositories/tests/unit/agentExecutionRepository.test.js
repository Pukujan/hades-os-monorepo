import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

async function loadRepo() {
  try {
    return await import("../../agentExecutionRepository.js");
  } catch (error) {
    throw new Error("Missing agentExecutionRepository.js", { cause: error });
  }
}

describe("agentExecutionRepository", () => {
  let repo;

  beforeEach(async () => {
    const mod = await loadRepo();
    repo = mod.createAgentExecutionRepository({ storage: "memory" });
  });

  test("creates execution log with user_id and tenant_id", async () => {
    const execution = await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "exec_a",
        provider: "discord",
        trigger_type: "command",
        status: "received",
      },
    });

    assert.equal(execution.user_id, "user_a");
    assert.equal(execution.tenant_id, "tenant_a");
  });

  test("stores provider and trigger type", async () => {
    const execution = await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "exec_a",
        provider: "telegram",
        trigger_type: "command",
        status: "received",
      },
    });

    assert.equal(execution.provider, "telegram");
    assert.equal(execution.trigger_type, "command");
  });

  test("stores minion_id and assignment_id", async () => {
    const execution = await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "exec_a",
        minion_id: "minion_a",
        assignment_id: "assign_a",
        status: "assigned",
      },
    });

    assert.equal(execution.minion_id, "minion_a");
    assert.equal(execution.assignment_id, "assign_a");
  });

  test("stores status success", async () => {
    const execution = await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "exec_a",
        status: "sent",
      },
    });

    assert.equal(execution.status, "sent");
  });

  test("stores status failed and failure_code", async () => {
    const execution = await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "exec_a",
        status: "failed",
        failure_code: "no_assigned_minion",
      },
    });

    assert.equal(execution.status, "failed");
    assert.equal(execution.failure_code, "no_assigned_minion");
  });

  test("never stores decrypted bot token", async () => {
    const execution = await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "exec_a",
        status: "received",
        payload: {
          content: "/catgif",
          botToken: "123456:SECRET",
          encrypted_bot_token: "encrypted-secret",
        },
      },
    });

    const json = JSON.stringify(execution);
    assert.ok(!json.includes("123456:SECRET"));
    assert.ok(!json.includes("encrypted-secret"));
  });

  test("list executions only returns current user's logs", async () => {
    await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: { id: "exec_a", status: "sent" },
    });

    await repo.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "exec_b", status: "sent" },
    });

    const executions = await repo.listByUser({
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assert.equal(executions.length, 1);
    assert.equal(executions[0].id, "exec_a");
  });
});
