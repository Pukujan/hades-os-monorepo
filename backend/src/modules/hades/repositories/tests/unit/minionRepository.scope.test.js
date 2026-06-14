import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

async function loadRepo() {
  try {
    return await import("../../minionRepository.js");
  } catch (error) {
    throw new Error("Missing minionRepository.js", { cause: error });
  }
}

describe("minionRepository tenant scoping", () => {
  let repo;

  beforeEach(async () => {
    const mod = await loadRepo();
    repo = mod.createMinionRepository({ storage: "memory" });

    await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: { id: "minion_a", name: "User A Minion", commandName: "!a" },
    });

    await repo.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "minion_b", name: "User B Minion", commandName: "!b" },
    });
  });

  test("findById returns minion owned by current user", async () => {
    const minion = await repo.findById({
      id: "minion_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assert.equal(minion.id, "minion_a");
    assert.equal(minion.user_id, "user_a");
    assert.equal(minion.tenant_id, "tenant_a");
  });

  test("findById returns null for another user's minion", async () => {
    const minion = await repo.findById({
      id: "minion_b",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assert.equal(minion, null);
  });

  test("listByUser only returns current user's minions", async () => {
    const minions = await repo.listByUser({
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assert.equal(minions.length, 1);
    assert.equal(minions[0].id, "minion_a");
  });

  test("create stores user_id and tenant_id", async () => {
    const minion = await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: { id: "minion_c", name: "Scoped Minion" },
    });

    assert.equal(minion.user_id, "user_a");
    assert.equal(minion.tenant_id, "tenant_a");
  });

  test("update rejects another user's minion", async () => {
    const updated = await repo.update({
      id: "minion_b",
      userId: "user_a",
      tenantId: "tenant_a",
      patch: { name: "Hijacked" },
    });

    assert.equal(updated, null);
  });

  test("delete rejects another user's minion", async () => {
    const deleted = await repo.delete({
      id: "minion_b",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assert.equal(deleted, false);

    const stillExists = await repo.findById({
      id: "minion_b",
      userId: "user_b",
      tenantId: "tenant_b",
    });

    assert.notEqual(stillExists, null);
  });
});
