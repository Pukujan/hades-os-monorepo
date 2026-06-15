import { test } from "node:test";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("minionLogsRepository", () => {
  it("exports createMinionLogsRepository", async () => {
    const mod = await import("../../minionLogsRepository.js");
    assert.equal(typeof mod.createMinionLogsRepository, "function");
  });

  it("insertLog stores a log entry", async () => {
    const mod = await import("../../minionLogsRepository.js");
    const repo = mod.createMinionLogsRepository({ tenantId: "tenant_1" });

    const log = await repo.insertLog({
      minionId: "m1",
      level: "info",
      summary: "Minion started",
      details: { status: "healthy" },
    });

    assert.ok(log.id);
    assert.equal(log.minionId, "m1");
    assert.equal(log.level, "info");
    assert.equal(log.summary, "Minion started");
  });

  it("listLogsByMinionId returns logs for a specific minion", async () => {
    const mod = await import("../../minionLogsRepository.js");
    const repo = mod.createMinionLogsRepository({ tenantId: "tenant_1" });

    await repo.insertLog({ minionId: "m1", level: "info", summary: "Log 1" });
    await repo.insertLog({ minionId: "m2", level: "info", summary: "Log 2" });
    await repo.insertLog({ minionId: "m1", level: "warn", summary: "Log 3" });

    const logs = await repo.listLogsByMinionId("m1");
    assert.equal(logs.length, 2);
    assert.ok(logs.every((l) => l.minionId === "m1"));
  });

  it("listLogsByMinionId supports pagination", async () => {
    const mod = await import("../../minionLogsRepository.js");
    const repo = mod.createMinionLogsRepository({ tenantId: "tenant_1" });

    for (let i = 0; i < 10; i++) {
      await repo.insertLog({ minionId: "m1", level: "info", summary: `Log ${i}` });
    }

    const page1 = await repo.listLogsByMinionId("m1", { limit: 3, offset: 0 });
    assert.equal(page1.length, 3);

    const page2 = await repo.listLogsByMinionId("m1", { limit: 3, offset: 3 });
    assert.equal(page2.length, 3);

    const ids1 = page1.map((l) => l.id);
    const ids2 = page2.map((l) => l.id);
    for (const id of ids1) {
      assert.ok(!ids2.includes(id), "pages must not overlap");
    }
  });

  it("listLogsByMinionId returns newest logs first", async () => {
    const mod = await import("../../minionLogsRepository.js");
    const repo = mod.createMinionLogsRepository({ tenantId: "tenant_1" });

    await repo.insertLog({ minionId: "m1", level: "info", summary: "Log 1" });
    await repo.insertLog({ minionId: "m1", level: "info", summary: "Log 2" });
    await repo.insertLog({ minionId: "m1", level: "info", summary: "Log 3" });

    const logs = await repo.listLogsByMinionId("m1");
    assert.ok(new Date(logs[0].createdAt) >= new Date(logs[1].createdAt));
  });

  it("getLog returns a single log by id", async () => {
    const mod = await import("../../minionLogsRepository.js");
    const repo = mod.createMinionLogsRepository({ tenantId: "tenant_1" });

    const inserted = await repo.insertLog({
      minionId: "m1",
      level: "error",
      summary: "Something broke",
    });

    const log = await repo.getLog(inserted.id);
    assert.ok(log);
    assert.equal(log.id, inserted.id);
    assert.equal(log.summary, "Something broke");
  });

  it("getLog returns null for non-existent id", async () => {
    const mod = await import("../../minionLogsRepository.js");
    const repo = mod.createMinionLogsRepository({ tenantId: "tenant_1" });

    const log = await repo.getLog("non_existent_id");
    assert.equal(log, null);
  });
});
