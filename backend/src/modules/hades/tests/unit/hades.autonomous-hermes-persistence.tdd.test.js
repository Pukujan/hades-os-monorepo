import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const MODULE_ROOT = path.resolve("src/modules/hades");

async function loadStateRepository() {
  try {
    return await import("../../repositories/hermesStateRepository.js");
  } catch (error) {
    throw new Error(
      "Missing hermesStateRepository.js. Expected Supabase metadata index for R2-backed Hermes state, tasks, routing, artifacts, and summaries.",
      { cause: error }
    );
  }
}

describe("Autonomous Hermes R2/Supabase persistence migrations TDD contract", () => {
  test("defines metadata index and task routing tables without storing bulky Hermes state", () => {
    const statePath = path.join(MODULE_ROOT, "migrations/012_hades_hermes_state_index.sql");
    const routesPath = path.join(MODULE_ROOT, "migrations/013_hades_hermes_task_routes.sql");

    assert.ok(fs.existsSync(statePath), "Missing 012_hades_hermes_state_index.sql migration");
    assert.ok(fs.existsSync(routesPath), "Missing 013_hades_hermes_task_routes.sql migration");

    const sql = `${fs.readFileSync(statePath, "utf8")}\n${fs.readFileSync(routesPath, "utf8")}`;
    assert.match(sql, /create table if not exists\s+.*hades_hermes_state_objects/is);
    assert.match(sql, /create table if not exists\s+.*hades_hermes_task_routes/is);
    assert.match(sql, /user_id\s+text\s+not null/i);
    assert.match(sql, /tenant_id\s+text\s+not null/i);
    assert.match(sql, /object_key\s+text\s+not null/i);
    assert.match(sql, /content_hash\s+text/i);
    assert.match(sql, /routing_token_hash\s+text\s+not null/i);
    assert.match(sql, /runtime_mode\s+text/i);
    assert.match(sql, /enable row level security/i);
    assert.doesNotMatch(sql, /skill_content\s+text/i);
    assert.doesNotMatch(sql, /session_db\s+bytea/i);
  });
});

describe("Autonomous Hermes state repository TDD contract", () => {
  test("indexes R2 objects by tenant/user without returning other users' object keys", async () => {
    const { createHermesStateRepository } = await loadStateRepository();
    const repo = createHermesStateRepository({ storage: "memory" });

    await repo.recordStateObject({
      userId: "user_a",
      tenantId: "tenant_a",
      kind: "memory",
      objectKey: "tenants/tenant_a/users/user_a/hermes/memory/MEMORY.md",
      contentHash: "hash_a",
      byteSize: 128,
    });
    await repo.recordStateObject({
      userId: "user_b",
      tenantId: "tenant_a",
      kind: "memory",
      objectKey: "tenants/tenant_a/users/user_b/hermes/memory/MEMORY.md",
      contentHash: "hash_b",
      byteSize: 256,
    });

    const objects = await repo.listStateObjects({ userId: "user_a", tenantId: "tenant_a" });
    const serialized = JSON.stringify(objects);

    assert.equal(objects.length, 1);
    assert.equal(objects[0].objectKey || objects[0].object_key, "tenants/tenant_a/users/user_a/hermes/memory/MEMORY.md");
    assert.equal(serialized.includes("user_b"), false);
  });

  test("stores task routing metadata with token hashes, never raw routing tokens", async () => {
    const { createHermesStateRepository } = await loadStateRepository();
    const repo = createHermesStateRepository({ storage: "memory" });

    await repo.createTaskRoute({
      taskId: "task_a",
      userId: "user_a",
      tenantId: "tenant_a",
      processId: "proc_a",
      routingToken: "raw-token-secret",
      routingTokenHash: "hash-token",
      destination: { provider: "telegram", chatId: "chat_a" },
      capabilityEnvelope: ["artifact.create", "telegram.propose_send"],
    });

    const route = await repo.findTaskRoute({ taskId: "task_a", userId: "user_a", tenantId: "tenant_a" });
    const serialized = JSON.stringify(route);

    assert.equal(route.taskId || route.task_id, "task_a");
    assert.equal(serialized.includes("hash-token"), true);
    assert.equal(serialized.includes("raw-token-secret"), false);
    assert.equal(serialized.includes("chat_a"), true);
  });

  test("records run summaries and artifact pointers without leaking provider keys", async () => {
    const { createHermesStateRepository } = await loadStateRepository();
    const repo = createHermesStateRepository({ storage: "memory" });

    await repo.recordRunSummary({
      runId: "run_a",
      taskId: "task_a",
      userId: "user_a",
      tenantId: "tenant_a",
      status: "completed",
      summary: "Created a Telegram GIF.",
      artifactObjects: [
        {
          type: "image/gif",
          objectKey: "tenants/tenant_a/users/user_a/hermes/artifacts/run_a/cat.gif",
          contentHash: "hash_gif",
        },
      ],
      rawOutput: { apiKey: "sk-secret", reply: "done" },
    });

    const runs = await repo.listRunSummaries({ userId: "user_a", tenantId: "tenant_a" });
    const serialized = JSON.stringify(runs);

    assert.equal(runs.length, 1);
    assert.equal(runs[0].status, "completed");
    assert.equal(serialized.includes("cat.gif"), true);
    assert.equal(serialized.includes("sk-secret"), false);
  });
});
