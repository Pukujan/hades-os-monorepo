import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadWorkspaceService() {
  try {
    return await import("../../runtime/hermesWorkspace.js");
  } catch (error) {
    throw new Error(
      "Missing hermesWorkspace.js. Expected scoped per-user Hermes workspace resolution for HERMES_HOME, cache, skills, memory, sessions, logs, and artifacts.",
      { cause: error }
    );
  }
}

async function loadStateStore() {
  try {
    return await import("../../runtime/hermesStateStore.js");
  } catch (error) {
    throw new Error(
      "Missing hermesStateStore.js. Expected R2-backed hydrate/snapshot/sync for user-scoped Hermes state and artifacts.",
      { cause: error }
    );
  }
}

async function loadRoutingTokenService() {
  try {
    return await import("../../runtime/hermesRoutingToken.js");
  } catch (error) {
    throw new Error(
      "Missing hermesRoutingToken.js. Expected Hades-issued taskId/routingToken issue and verification for Hermes responses.",
      { cause: error }
    );
  }
}

async function loadCapabilityEnvelope() {
  try {
    return await import("../../runtime/hermesCapabilityEnvelope.js");
  } catch (error) {
    throw new Error(
      "Missing hermesCapabilityEnvelope.js. Expected broad internal capability grants and separated boundary action policy.",
      { cause: error }
    );
  }
}

async function loadBoundaryActionBroker() {
  try {
    return await import("../../runtime/hermesBoundaryActionBroker.js");
  } catch (error) {
    throw new Error(
      "Missing hermesBoundaryActionBroker.js. Expected Hades-owned verification/execution of Hermes proposed boundary actions.",
      { cause: error }
    );
  }
}

async function loadProcessManager() {
  try {
    return await import("../../runtime/hermesProcessManager.js");
  } catch (error) {
    throw new Error(
      "Missing hermesProcessManager.js. Expected per-user Hermes lifecycle manager with workspace hydration, signed routing, queueing, idle kill, status, and crash recovery.",
      { cause: error }
    );
  }
}

describe("Autonomous Hermes workspace TDD contract", () => {
  test("resolves user-scoped Hermes universe directories and env", async () => {
    const { createHermesWorkspaceService } = await loadWorkspaceService();
    const workspaces = createHermesWorkspaceService({ rootDir: "/tmp/hades-hermes-test" });

    const userA = workspaces.resolveWorkspace({ userId: "user_a", tenantId: "tenant_a" });
    const userB = workspaces.resolveWorkspace({ userId: "user_b", tenantId: "tenant_a" });

    assert.match(userA.homeDir, /tenant_a/);
    assert.match(userA.homeDir, /user_a/);
    assert.match(userA.cacheDir, /cache$/);
    assert.match(userA.skillsDir, /skills$/);
    assert.match(userA.memoryDir || userA.memoriesDir, /memor/i);
    assert.match(userA.sessionsDir, /sessions$/);
    assert.match(userA.logsDir, /logs$/);
    assert.match(userA.artifactsDir, /artifacts$/);
    assert.notEqual(userA.homeDir, userB.homeDir);
    assert.equal(userA.env.HERMES_HOME, userA.homeDir);
    assert.equal(userA.env.HERMES_CACHE_DIR, userA.cacheDir);
  });

  test("rejects traversal and strips dangerous environment from Hermes subprocess env", async () => {
    const { createHermesWorkspaceService } = await loadWorkspaceService();
    const workspaces = createHermesWorkspaceService({ rootDir: "/tmp/hades-hermes-test" });

    assert.throws(
      () => workspaces.resolveWorkspace({ userId: "../user_b", tenantId: "tenant_a" }),
      /invalid|traversal|workspace/i
    );

    const workspace = workspaces.resolveWorkspace({ userId: "user_a", tenantId: "tenant_a" });
    const env = workspaces.buildHermesEnv({
      workspace,
      baseEnv: {
        OPENROUTER_API_KEY: "sk-provider",
        SUPABASE_SERVICE_ROLE_KEY: "service-role",
        TELEGRAM_BOT_TOKEN: "global-bot-token",
        HERMES_CONTEXT_LENGTH: "64000",
      },
    });

    assert.equal(env.HERMES_HOME, workspace.homeDir);
    assert.equal(env.HERMES_CACHE_DIR, workspace.cacheDir);
    assert.equal(env.OPENROUTER_API_KEY, "sk-provider");
    assert.equal(Object.hasOwn(env, "SUPABASE_SERVICE_ROLE_KEY"), false);
    assert.equal(Object.hasOwn(env, "TELEGRAM_BOT_TOKEN"), false);
  });
});

describe("Autonomous Hermes R2 state store TDD contract", () => {
  test("hydrates and snapshots user-scoped Hermes state through object storage keys", async () => {
    const { createHermesStateStore } = await loadStateStore();
    const puts = [];
    const writes = [];
    const store = createHermesStateStore({
      objectStore: {
        getObject: async ({ key }) => ({ key, body: "memory from r2" }),
        putObject: async (record) => {
          puts.push(record);
          return { key: record.key, etag: "etag_1" };
        },
      },
      filesystem: {
        writeFile: async (targetPath, content) => writes.push({ targetPath, content }),
        readChangedFiles: async () => [
          { relativePath: "MEMORY.md", content: "updated memory" },
          { relativePath: "skills/gif-maker/SKILL.md", content: "---\nname: gif-maker\n---\nMake GIFs." },
        ],
      },
    });

    await store.hydrateWorkspace({
      userId: "user_a",
      tenantId: "tenant_a",
      workspace: { homeDir: "/tmp/hades-hermes-test/tenant_a/user_a" },
      objects: [{ key: "tenants/tenant_a/users/user_a/hermes/memory/MEMORY.md", relativePath: "MEMORY.md" }],
    });

    const snapshot = await store.snapshotWorkspace({
      userId: "user_a",
      tenantId: "tenant_a",
      workspace: { homeDir: "/tmp/hades-hermes-test/tenant_a/user_a" },
    });

    assert.equal(writes.length, 1);
    assert.match(writes[0].targetPath, /MEMORY\.md$/);
    assert.equal(puts.length, 2);
    assert.ok(puts.every((put) => put.key.startsWith("tenants/tenant_a/users/user_a/hermes/")));
    assert.ok(snapshot.objects.every((object) => typeof object.contentHash === "string"));
  });

  test("rejects secret-bearing or escaped state files before R2 upload", async () => {
    const { createHermesStateStore } = await loadStateStore();
    const store = createHermesStateStore({
      objectStore: { putObject: async () => ({}) },
      filesystem: {
        readChangedFiles: async () => [
          { relativePath: ".env", content: "SUPABASE_SERVICE_ROLE_KEY=secret" },
          { relativePath: "../other-user/MEMORY.md", content: "bad" },
        ],
      },
    });

    await assert.rejects(
      () =>
        store.snapshotWorkspace({
          userId: "user_a",
          tenantId: "tenant_a",
          workspace: { homeDir: "/tmp/hades-hermes-test/tenant_a/user_a" },
        }),
      /secret|escape|traversal|outside/i
    );
  });
});

describe("Autonomous Hermes routing token TDD contract", () => {
  test("issues and verifies Hades-owned task routing tokens", async () => {
    const { createHermesRoutingTokenService } = await loadRoutingTokenService();
    const routing = createHermesRoutingTokenService({ secret: "unit-test-secret" });

    const issued = await routing.issueTask({
      userId: "user_a",
      tenantId: "tenant_a",
      processId: "proc_a",
      destination: { provider: "telegram", chatId: "chat_a" },
    });

    assert.ok(issued.taskId);
    assert.ok(issued.routingToken);

    const verified = await routing.verifyResponse({
      taskId: issued.taskId,
      routingToken: issued.routingToken,
      processId: "proc_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assert.equal(verified.userId, "user_a");
    assert.equal(verified.tenantId, "tenant_a");
  });

  test("rejects spoofed Hermes-authored user ids and wrong process responses", async () => {
    const { createHermesRoutingTokenService } = await loadRoutingTokenService();
    const routing = createHermesRoutingTokenService({ secret: "unit-test-secret" });
    const issued = await routing.issueTask({ userId: "user_a", tenantId: "tenant_a", processId: "proc_a" });

    await assert.rejects(
      () =>
        routing.verifyResponse({
          taskId: issued.taskId,
          routingToken: issued.routingToken,
          processId: "proc_b",
          userId: "user_b",
          tenantId: "tenant_a",
        }),
      /route|token|process|user|tenant/i
    );
  });
});

describe("Autonomous Hermes capability envelope TDD contract", () => {
  test("grants broad internal capabilities while separating boundary actions", async () => {
    const { createHermesCapabilityEnvelope } = await loadCapabilityEnvelope();
    const envelope = createHermesCapabilityEnvelope({
      grants: [
        "filesystem.workspace.read",
        "filesystem.workspace.write",
        "artifact.create",
        "media.generate.image",
        "media.generate.video",
        "skills.create",
        "memory.write",
        "telegram.propose_send",
      ],
      approvalRequired: ["telegram.send", "discord.send", "browser.submit", "public.publish"],
    });

    assert.equal(envelope.can("artifact.create"), true);
    assert.equal(envelope.can("media.generate.video"), true);
    assert.equal(envelope.can("skills.create"), true);
    assert.equal(envelope.can("telegram.send"), false);
    assert.equal(envelope.requiresApproval("telegram.send"), true);
  });
});

describe("Autonomous Hermes boundary action broker TDD contract", () => {
  test("sends Telegram GIF/media only after route and capability verification", async () => {
    const { createHermesBoundaryActionBroker } = await loadBoundaryActionBroker();
    const animations = [];
    const broker = createHermesBoundaryActionBroker({
      routing: {
        verifyResponse: async () => ({
          userId: "user_a",
          tenantId: "tenant_a",
          destination: { provider: "telegram", chatId: "chat_a" },
        }),
      },
      capabilityEnvelope: { can: (capability) => capability === "telegram.propose_send", requiresApproval: () => false },
      telegramClientFactory: async () => ({
        sendAnimation: async (opts) => {
          animations.push(opts);
          return { providerMessageId: 42 };
        },
      }),
      artifactStore: {
        resolveSignedUrl: async ({ objectKey }) => `https://r2.example/${objectKey}`,
      },
    });

    const result = await broker.handleProposedActions({
      taskId: "task_a",
      routingToken: "token_a",
      processId: "proc_a",
      actions: [
        {
          type: "telegram.send_animation",
          mediaObjectKey: "tenants/tenant_a/users/user_a/hermes/artifacts/run_1/cat.gif",
          caption: "Here is one.",
        },
      ],
    });

    assert.equal(result.executed.length, 1);
    assert.equal(animations.length, 1);
    assert.equal(animations[0].chatId, "chat_a");
    assert.match(animations[0].animation, /cat\.gif$/);
  });

  test("pauses high-risk boundary actions for approval", async () => {
    const { createHermesBoundaryActionBroker } = await loadBoundaryActionBroker();
    const approvals = [];
    const broker = createHermesBoundaryActionBroker({
      routing: { verifyResponse: async () => ({ userId: "user_a", tenantId: "tenant_a" }) },
      capabilityEnvelope: { can: () => false, requiresApproval: (capability) => capability === "browser.submit" },
      approvalRepository: {
        create: async (request) => {
          approvals.push(request);
          return { id: "approval_1", ...request };
        },
      },
    });

    const result = await broker.handleProposedActions({
      taskId: "task_a",
      routingToken: "token_a",
      processId: "proc_a",
      actions: [{ type: "browser.submit", target: "job-application-form" }],
    });

    assert.equal(result.status, "approval_required");
    assert.equal(approvals.length, 1);
    assert.equal(approvals[0].action.type, "browser.submit");
  });
});

describe("Autonomous Hermes process manager TDD contract", () => {
  test("hydrates workspace before task and snapshots state after task", async () => {
    const { createHermesProcessManager } = await loadProcessManager();
    const events = [];
    const manager = createHermesProcessManager({
      workspaceRoot: "/tmp/hades-hermes-test",
      stateStore: {
        hydrateWorkspace: async () => events.push("hydrate"),
        snapshotWorkspace: async () => events.push("snapshot"),
      },
      routing: {
        issueTask: async () => ({ taskId: "task_1", routingToken: "token_1" }),
        verifyResponse: async () => ({ userId: "user_a", tenantId: "tenant_a" }),
      },
      spawnRuntime: async () => ({
        id: "proc_a",
        run: async (task) => ({ taskId: task.taskId, routingToken: task.routingToken, reply: "ok" }),
        stop: async () => {},
        status: () => ({ state: "ready" }),
      }),
    });

    const result = await manager.runTask({ userId: "user_a", tenantId: "tenant_a", message: "hello" });

    assert.equal(result.reply, "ok");
    assert.deepEqual(events, ["hydrate", "snapshot"]);
  });
});
