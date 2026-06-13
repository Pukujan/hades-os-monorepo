import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

async function loadRepo() {
  try {
    return await import("../../assignmentRepository.js");
  } catch (error) {
    throw new Error("Missing assignmentRepository.js", { cause: error });
  }
}

describe("assignmentRepository tenant scoping", () => {
  let repo;

  beforeEach(async () => {
    const mod = await loadRepo();
    repo = mod.createAssignmentRepository({ storage: "memory" });

    await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "assign_a",
        minion_id: "minion_a",
        provider: "discord",
        command_name: "!catgif",
        status: "active",
      },
    });

    await repo.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: {
        id: "assign_b",
        minion_id: "minion_b",
        provider: "discord",
        command_name: "!catgif",
        status: "active",
      },
    });
  });

  test("findActiveAssignment only searches current user's assignments", async () => {
    const assignment = await repo.findActiveAssignment({
      userId: "user_a",
      tenantId: "tenant_a",
      provider: "discord",
      commandName: "!catgif",
    });

    assert.equal(assignment.id, "assign_a");
    assert.equal(assignment.user_id, "user_a");
  });

  test("does not return another user's matching command assignment", async () => {
    const assignment = await repo.findActiveAssignment({
      userId: "user_a",
      tenantId: "tenant_a",
      provider: "telegram",
      commandName: "!catgif",
    });

    assert.equal(assignment, null);
  });

  test("create stores user_id and tenant_id", async () => {
    const assignment = await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "assign_c",
        minion_id: "minion_c",
        provider: "telegram",
        command_name: "/summarize",
        status: "active",
      },
    });

    assert.equal(assignment.user_id, "user_a");
    assert.equal(assignment.tenant_id, "tenant_a");
  });

  test("ignores inactive assignments", async () => {
    await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "assign_inactive",
        minion_id: "minion_inactive",
        provider: "discord",
        command_name: "!off",
        status: "inactive",
      },
    });

    const assignment = await repo.findActiveAssignment({
      userId: "user_a",
      tenantId: "tenant_a",
      provider: "discord",
      commandName: "!off",
    });

    assert.equal(assignment, null);
  });
});
