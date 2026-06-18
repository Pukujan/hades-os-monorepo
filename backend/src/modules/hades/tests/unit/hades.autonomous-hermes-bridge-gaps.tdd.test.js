import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const MODULE_ROOT = path.resolve("src/modules/hades");

async function loadStateRepository() {
  return import("../../repositories/hermesStateRepository.js");
}

async function loadRoutingTokenService() {
  return import("../../runtime/hermesRoutingToken.js");
}

async function loadObjectStore() {
  try {
    return await import("../../runtime/hermesObjectStore.js");
  } catch (error) {
    throw new Error(
      "Missing hermesObjectStore.js. Expected temporary Supabase object-store adapter now and Cloudflare R2 adapter later.",
      { cause: error }
    );
  }
}

async function loadFilesystem() {
  try {
    return await import("../../runtime/hermesFilesystem.js");
  } catch (error) {
    throw new Error(
      "Missing hermesFilesystem.js. Expected filesystem adapter for safe hydrate/snapshot reads and writes.",
      { cause: error }
    );
  }
}

async function loadRuntimeSpawn() {
  try {
    return await import("../../runtime/hermesRuntimeSpawn.js");
  } catch (error) {
    throw new Error(
      "Missing hermesRuntimeSpawn.js. Expected spawnRuntime wrapper around createHermesRuntimeService/Hermes subprocess.",
      { cause: error }
    );
  }
}

async function loadArtifactStore() {
  try {
    return await import("../../runtime/hermesArtifactStore.js");
  } catch (error) {
    throw new Error(
      "Missing hermesArtifactStore.js. Expected artifact store with scoped object-key validation and signed URL resolution.",
      { cause: error }
    );
  }
}

async function loadStateStore() {
  return import("../../runtime/hermesStateStore.js");
}

async function loadProcessManager() {
  return import("../../runtime/hermesProcessManager.js");
}

function createRecordingSupabase() {
  const calls = [];
  const rowsByTable = new Map();

  function tableRows(table) {
    if (!rowsByTable.has(table)) rowsByTable.set(table, []);
    return rowsByTable.get(table);
  }

  return {
    calls,
    from(table) {
      calls.push({ op: "from", table });
      const filters = [];
      const builder = {
        insert(rows) {
          const records = Array.isArray(rows) ? rows : [rows];
          tableRows(table).push(...records);
          calls.push({ op: "insert", table, rows: records });
          return Promise.resolve({ data: records, error: null });
        },
        select(columns = "*") {
          calls.push({ op: "select", table, columns });
          return builder;
        },
        eq(column, value) {
          filters.push({ column, value });
          calls.push({ op: "eq", table, column, value });
          return builder;
        },
        order(column) {
          calls.push({ op: "order", table, column });
          return builder;
        },
        limit(count) {
          calls.push({ op: "limit", table, count });
          return builder;
        },
        maybeSingle() {
          const record = tableRows(table).find((row) =>
            filters.every((filter) => row[filter.column] === filter.value)
          );
          return Promise.resolve({ data: record || null, error: null });
        },
        then(resolve, reject) {
          const records = tableRows(table).filter((row) =>
            filters.every((filter) => row[filter.column] === filter.value)
          );
          return Promise.resolve({ data: records, error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

describe("Autonomous Hermes bridge gaps: dead schema must become live Supabase persistence", () => {
  test("hermesStateRepository writes state objects and task routes to existing Supabase tables", async () => {
    const { createHermesStateRepository } = await loadStateRepository();
    const supabaseClient = createRecordingSupabase();
    const repo = createHermesStateRepository({ storage: "supabase", supabaseClient });

    await repo.recordStateObject({
      userId: "user_a",
      tenantId: "tenant_a",
      kind: "memory",
      objectKey: "tenants/tenant_a/users/user_a/hermes/memory/MEMORY.md",
      contentHash: "hash_memory",
      byteSize: 12,
    });
    await repo.createTaskRoute({
      taskId: "task_a",
      userId: "user_a",
      tenantId: "tenant_a",
      processId: "proc_a",
      routingToken: "raw-token-never-store",
      routingTokenHash: "hash-token",
      destination: { provider: "telegram", chatId: "chat_a" },
      capabilityEnvelope: ["artifact.create", "telegram.propose_send"],
    });
    const inserts = supabaseClient.calls.filter((call) => call.op === "insert");
    assert.ok(
      inserts.some((call) => call.table === "hades_hermes_state_objects"),
      "state objects must write to 012_hades_hermes_state_index.sql table"
    );
    assert.ok(
      inserts.some((call) => call.table === "hades_hermes_task_routes"),
      "task routes must write to 013_hades_hermes_task_routes.sql table"
    );
    assert.equal(JSON.stringify(inserts).includes("raw-token-never-store"), false);
  });

  test("routing tokens survive process restart by persisting route hashes through repository", async () => {
    const { createHermesRoutingTokenService } = await loadRoutingTokenService();
    const routes = new Map();
    const repository = {
      async createTaskRoute(route) {
        routes.set(route.taskId, { ...route });
        return { ...route, routingToken: undefined };
      },
      async findTaskRoute({ taskId, userId, tenantId }) {
        const route = routes.get(taskId);
        if (!route || route.userId !== userId || route.tenantId !== tenantId) return null;
        return { ...route, routingToken: undefined };
      },
    };

    const firstProcess = createHermesRoutingTokenService({ secret: "unit-secret", repository });
    const issued = await firstProcess.issueTask({
      userId: "user_a",
      tenantId: "tenant_a",
      processId: "proc_a",
      destination: { provider: "telegram", chatId: "chat_a" },
    });

    const afterRestart = createHermesRoutingTokenService({ secret: "unit-secret", repository });
    const verified = await afterRestart.verifyResponse({
      taskId: issued.taskId,
      routingToken: issued.routingToken,
      processId: "proc_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assert.equal(verified.userId, "user_a");
    assert.equal(verified.destination.chatId, "chat_a");
  });
});

describe("Autonomous Hermes bridge gaps: production adapters", () => {
  test("object store factory supports temporary Supabase storage and future R2 without changing stateStore", async () => {
    const { createHermesObjectStore } = await loadObjectStore();
    const supabaseClient = createRecordingSupabase();

    const objectStore = createHermesObjectStore({
      mode: "supabase",
      supabaseClient,
      bucket: "hades-hermes-temp",
    });

    assert.equal(typeof objectStore.getObject, "function");
    assert.equal(typeof objectStore.putObject, "function");
    assert.equal(typeof objectStore.deleteObject, "function");
    assert.equal(typeof objectStore.createSignedUrl, "function");
  });

  test("filesystem adapter reads changed workspace files and rejects paths outside HERMES_HOME", async () => {
    const { createHermesFilesystem } = await loadFilesystem();
    const filesystem = createHermesFilesystem({ homeDir: "/tmp/hades-hermes-test/tenant_a/user_a" });

    assert.equal(typeof filesystem.writeFile, "function");
    assert.equal(typeof filesystem.readChangedFiles, "function");
    await assert.rejects(
      () => filesystem.writeFile("/tmp/hades-hermes-test/tenant_a/user_b/MEMORY.md", "bad"),
      /outside|workspace|traversal/i
    );
  });

  test("spawnRuntime wraps the existing Hermes subprocess service and injects scoped env", async () => {
    const { createHermesRuntimeSpawner } = await loadRuntimeSpawn();
    const calls = [];
    const spawner = createHermesRuntimeSpawner({
      hermesRuntimeServiceFactory: ({ runCommand }) => ({
        generateCommandResult: async ({ input, context }) => {
          calls.push({ input, context, runCommand: typeof runCommand });
          return { assistantText: "ok", outboundActions: [] };
        },
      }),
    });

    const runtime = await spawner.spawnRuntime({
      userId: "user_a",
      tenantId: "tenant_a",
      workspace: {
        homeDir: "/tmp/hades-hermes-test/tenant_a/user_a",
        env: { HERMES_HOME: "/tmp/hades-hermes-test/tenant_a/user_a" },
      },
      taskId: "task_a",
      routingToken: "token_a",
    });

    const result = await runtime.run({ message: "hello", taskId: "task_a", routingToken: "token_a" });
    assert.equal(result.reply || result.assistantText, "ok");
    assert.equal(calls[0].context.userId, "user_a");
  });

  test("artifact store resolves only scoped media object keys to short-lived signed URLs", async () => {
    const { createHermesArtifactStore } = await loadArtifactStore();
    const artifactStore = createHermesArtifactStore({
      objectStore: {
        createSignedUrl: async ({ key, expiresInSeconds }) => ({
          url: `https://storage.example/${key}?exp=${expiresInSeconds}`,
        }),
      },
      defaultTtlSeconds: 60,
    });

    const url = await artifactStore.resolveSignedUrl({
      userId: "user_a",
      tenantId: "tenant_a",
      objectKey: "tenants/tenant_a/users/user_a/hermes/artifacts/run_a/cat.gif",
    });

    assert.match(url, /^https:\/\/storage\.example\//);
    await assert.rejects(
      () =>
        artifactStore.resolveSignedUrl({
          userId: "user_a",
          tenantId: "tenant_a",
          objectKey: "tenants/tenant_a/users/user_b/hermes/artifacts/run_a/cat.gif",
        }),
      /scope|user|tenant|object/i
    );
  });

  test("state store can be built from real object-store and filesystem factories", async () => {
    const { createHermesStateStore } = await loadStateStore();
    const events = [];
    const store = createHermesStateStore({
      objectStoreFactory: ({ userId, tenantId }) => {
        events.push(`objectStore:${tenantId}:${userId}`);
        return {
          getObject: async ({ key }) => ({ key, body: "remembered state" }),
          putObject: async ({ key }) => ({ key, etag: "etag_1" }),
        };
      },
      filesystemFactory: ({ workspace }) => {
        events.push(`filesystem:${workspace.homeDir}`);
        return {
          writeFile: async () => events.push("writeFile"),
          readChangedFiles: async () => [{ relativePath: "MEMORY.md", content: "updated" }],
        };
      },
      repository: {
        listStateObjects: async () => [
          {
            object_key: "tenants/tenant_a/users/user_a/hermes/memory/MEMORY.md",
            relative_path: "MEMORY.md",
          },
        ],
        recordStateObject: async () => events.push("recordStateObject"),
      },
    });

    await store.hydrateWorkspace({
      userId: "user_a",
      tenantId: "tenant_a",
      workspace: { homeDir: "/tmp/hades-hermes-test/tenant_a/user_a" },
    });
    await store.snapshotWorkspace({
      userId: "user_a",
      tenantId: "tenant_a",
      workspace: { homeDir: "/tmp/hades-hermes-test/tenant_a/user_a" },
    });

    assert.deepEqual(events, [
      "objectStore:tenant_a:user_a",
      "filesystem:/tmp/hades-hermes-test/tenant_a/user_a",
      "writeFile",
      "objectStore:tenant_a:user_a",
      "filesystem:/tmp/hades-hermes-test/tenant_a/user_a",
      "recordStateObject",
    ]);
  });

  test("process manager uses workspace service and production bridge dependencies", async () => {
    const { createHermesProcessManager } = await loadProcessManager();
    const events = [];
    const manager = createHermesProcessManager({
      workspaceRoot: "/tmp/hades-hermes-test",
      workspaceService: {
        resolveWorkspace: ({ tenantId, userId }) => {
          events.push(`resolve:${tenantId}:${userId}`);
          return {
            homeDir: `/tmp/hades-hermes-test/${tenantId}/${userId}`,
            env: { HERMES_HOME: `/tmp/hades-hermes-test/${tenantId}/${userId}` },
          };
        },
      },
      stateStore: {
        hydrateWorkspace: async () => events.push("hydrate"),
        snapshotWorkspace: async () => events.push("snapshot"),
      },
      routing: {
        issueTask: async () => ({ taskId: "task_a", routingToken: "token_a" }),
        verifyResponse: async () => ({ userId: "user_a", tenantId: "tenant_a" }),
      },
      artifactStore: { resolveSignedUrl: async () => "https://storage.example/cat.gif" },
      spawnRuntime: async ({ workspace, artifactStore }) => {
        events.push(`spawn:${workspace.homeDir}`);
        assert.equal(typeof artifactStore.resolveSignedUrl, "function");
        return {
          id: "proc_a",
          run: async (task) => ({ taskId: task.taskId, routingToken: task.routingToken, reply: "ok" }),
          stop: async () => {},
          status: () => ({ state: "ready" }),
        };
      },
    });

    const result = await manager.runTask({
      userId: "user_a",
      tenantId: "tenant_a",
      message: "create a Telegram GIF",
    });

    assert.equal(result.reply, "ok");
    assert.deepEqual(events, [
      "resolve:tenant_a:user_a",
      "hydrate",
      "spawn:/tmp/hades-hermes-test/tenant_a/user_a",
      "snapshot",
    ]);
  });
});

describe("Autonomous Hermes bridge gaps: Hades module wiring", () => {
  test("index.js imports and wires autonomous Hermes factories instead of leaving modules dead", () => {
    const indexPath = path.join(MODULE_ROOT, "index.js");
    const source = fs.readFileSync(indexPath, "utf8");
    const requiredFactories = [
      "createHermesWorkspaceService",
      "createHermesStateStore",
      "createHermesStateRepository",
      "createHermesRoutingTokenService",
      "createHermesCapabilityEnvelope",
      "createHermesBoundaryActionBroker",
      "createHermesProcessManager",
      "createHermesObjectStore",
      "createHermesFilesystem",
      "createHermesRuntimeSpawner",
      "createHermesArtifactStore",
    ];

    for (const factory of requiredFactories) {
      assert.match(source, new RegExp(`import .*${factory}|${factory}\\(`), `${factory} must be wired in index.js`);
    }
  });
});
