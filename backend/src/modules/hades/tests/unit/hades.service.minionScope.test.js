import { test } from "node:test";
import assert from "node:assert/strict";
import { createHadesService } from "../../services/hades.service.js";

test("updateMinion forwards tenantId to scoped minion repository", async () => {
  let received = null;
  const service = createHadesService({
    scopedRepos: {
      minions: {
        async update(input) {
          received = input;
          return { id: input.id, ...input.patch };
        },
      },
    },
  });

  await service.updateMinion("minion-123", { name: "Updated helper" }, { userId: "user-1", tenantId: "tenant-9" });

  assert.deepEqual(received, {
    id: "minion-123",
    userId: "user-1",
    tenantId: "tenant-9",
    patch: { name: "Updated helper" },
  });
});

test("deleteMinion forwards tenantId to scoped minion repository", async () => {
  let received = null;
  const service = createHadesService({
    scopedRepos: {
      minions: {
        async delete(input) {
          received = input;
          return true;
        },
      },
    },
  });

  await service.deleteMinion("minion-456", { userId: "user-1", tenantId: "tenant-9" });

  assert.deepEqual(received, {
    id: "minion-456",
    userId: "user-1",
    tenantId: "tenant-9",
  });
});

test("saveMinion persists v2 metadata for scoped minions", async () => {
  let received = null;
  const service = createHadesService({
    scopedRepos: {
      minions: {
        async create(input) {
          received = input;
          return { id: "m1", ...input.data };
        },
      },
    },
  });

  await service.saveMinion({
    idempotencyKey: "save-1",
    draft: {
      name: "Cat Courier",
      description: "Sends cat memes",
      category: "fun",
      targetSocial: "discord",
      triggerType: "command",
      commandName: "!sendcat",
      action: "send cat memes",
      responseStyle: "helpful",
      safetyMode: "ask_first",
    },
  }, { userId: "user-1", tenantId: "tenant-9" });

  assert.equal(received.data.schema_version, "hades.minion.v2");
  assert.equal(received.data.version, "1.0.0");
  assert.equal(received.data.metadata.schemaVersion, "hades.minion.v2");
  assert.equal(received.data.metadata.version, "1.0.0");
});
