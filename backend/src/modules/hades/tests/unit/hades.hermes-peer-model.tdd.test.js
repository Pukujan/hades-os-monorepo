import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const MODULE_ROOT = path.resolve("src/modules/hades");

async function loadRoutingTokenService() {
  return import("../../runtime/hermesRoutingToken.js");
}

async function loadBoundaryActionBroker() {
  return import("../../runtime/hermesBoundaryActionBroker.js");
}

async function loadProfileSessionBroker() {
  try {
    return await import("../../runtime/hermesProfileSessionBroker.js");
  } catch (error) {
    throw new Error(
      "Missing hermesProfileSessionBroker.js. Expected Hades session bootstrap to return edge route metadata without browser-visible Hermes API auth.",
      { cause: error }
    );
  }
}

async function loadProfileRegistry() {
  try {
    return await import("../../runtime/hermesProfileRegistry.js");
  } catch (error) {
    throw new Error(
      "Missing hermesProfileRegistry.js. Expected registry to persist profile route metadata without raw API_SERVER_KEY.",
      { cause: error }
    );
  }
}

async function loadProfileRouter() {
  try {
    return await import("../../runtime/hermesProfileRouter.js");
  } catch (error) {
    throw new Error(
      "Missing hermesProfileRouter.js. Expected router to separate browser edge routes from internal loopback Hermes API targets.",
      { cause: error }
    );
  }
}

async function loadProfileProvisioner() {
  try {
    return await import("../../runtime/hermesProfileProvisioner.js");
  } catch (error) {
    throw new Error(
      "Missing hermesProfileProvisioner.js. Expected safe Hermes CLI profile lifecycle provisioning.",
      { cause: error }
    );
  }
}

async function loadEdgeAuthProxy() {
  try {
    return await import("../../runtime/hermesEdgeAuthProxy.js");
  } catch (error) {
    throw new Error(
      "Missing hermesEdgeAuthProxy.js. Expected thin edge proxy to inject per-profile API_SERVER_KEY server-side.",
      { cause: error }
    );
  }
}

async function loadProfileStatePersistence() {
  try {
    return await import("../../runtime/hermesProfileStatePersistence.js");
  } catch (error) {
    throw new Error(
      "Missing hermesProfileStatePersistence.js. Expected per-user Hermes profile state to live on persistent Railway volume and support secret-safe snapshots.",
      { cause: error }
    );
  }
}

describe("Hades/Hermes peer model TDD contract", () => {
  test("Hades no longer mounts client-facing Hermes proxy routes under /api/hades/hermes", () => {
    const indexSource = fs.readFileSync(path.join(MODULE_ROOT, "index.js"), "utf8");

    assert.doesNotMatch(indexSource, /createHermesRoutes/);
    assert.doesNotMatch(indexSource, /app\.use\(["']\/api\/hades\/hermes["']/);
  });

  test("Hades-owned Hermes routes expose only boundary approval and audit/state-index endpoints", () => {
    const routesPath = path.join(MODULE_ROOT, "routes/hermes.routes.js");
    const source = fs.existsSync(routesPath) ? fs.readFileSync(routesPath, "utf8") : "";

    assert.doesNotMatch(source, /router\.post\(\s*["']\/tasks["']/);
    assert.doesNotMatch(source, /router\.get\(\s*["']\/status["']/);
    assert.doesNotMatch(source, /router\.get\(\s*["']\/skills["']/);
    assert.doesNotMatch(source, /processManager\.runTask/);
    assert.match(source, /router\.post\(\s*["']\/sessions["']|\/sessions/i);
    assert.match(source, /approval|boundary|audit|state/i);
  });
});

describe("Stateless local routing-token verification", () => {
  test("Hermes can verify Hades-issued routing tokens locally without repository or callback", async () => {
    const { createHermesRoutingTokenService } = await loadRoutingTokenService();

    const hadesIssuer = createHermesRoutingTokenService({ secret: "peer-secret" });
    const issued = await hadesIssuer.issueTask({
      userId: "user_a",
      tenantId: "tenant_a",
      processId: "hermes_proc_a",
      destination: { provider: "telegram", chatId: "chat_a" },
      capabilities: ["workspace.write", "telegram.propose_send"],
    });

    const hermesVerifier = createHermesRoutingTokenService({ secret: "peer-secret" });
    const verified = await hermesVerifier.verifyResponse({
      taskId: issued.taskId,
      routingToken: issued.routingToken,
      processId: "hermes_proc_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assert.equal(verified.userId, "user_a");
    assert.equal(verified.tenantId, "tenant_a");
    assert.deepEqual(verified.capabilities || verified.capabilityEnvelope, ["workspace.write", "telegram.propose_send"]);
  });

  test("routing token rejects changed workspace, process lineage, or capability scope locally", async () => {
    const { createHermesRoutingTokenService } = await loadRoutingTokenService();
    const routing = createHermesRoutingTokenService({ secret: "peer-secret" });
    const issued = await routing.issueTask({
      userId: "user_a",
      tenantId: "tenant_a",
      processId: "proc_a",
      workspaceId: "workspace_a",
    });

    const verifier = createHermesRoutingTokenService({ secret: "peer-secret" });
    await assert.rejects(
      () =>
        verifier.verifyResponse({
          taskId: issued.taskId,
          routingToken: issued.routingToken,
          processId: "proc_b",
          userId: "user_a",
          tenantId: "tenant_a",
          workspaceId: "workspace_a",
        }),
      /token|process|lineage|scope/i
    );
  });
});

describe("Hermes profile API session routing and auth translation", () => {
  test("profile registry persists route metadata with API_SERVER_KEY hash only", async () => {
    const { createHermesProfileRegistry } = await loadProfileRegistry();
    const registry = createHermesProfileRegistry({ storage: "memory" });

    const stored = await registry.upsertProfile({
      tenantId: "tenant_a",
      userId: "user_a",
      profileName: "tenant_a_user_a",
      hermesHome: "/srv/hermes/profiles/tenant_a_user_a",
      apiHost: "127.0.0.1",
      apiPort: 8657,
      edgeBaseUrl: "https://app.test/hermes/tenant_a_user_a/v1",
      apiServerKey: "profile-static-secret",
      gatewayStatus: "running",
    });

    assert.equal(stored.profileName, "tenant_a_user_a");
    assert.equal(stored.apiHost, "127.0.0.1");
    assert.equal(stored.apiPort, 8657);
    assert.equal(stored.edgeBaseUrl, "https://app.test/hermes/tenant_a_user_a/v1");
    assert.ok(stored.apiServerKeyHash);
    assert.equal(Object.hasOwn(stored, "apiServerKey"), false);
    assert.equal(JSON.stringify(stored).includes("profile-static-secret"), false);

    const byIdentity = await registry.findProfile({ tenantId: "tenant_a", userId: "user_a" });
    const byName = await registry.findProfile({ profileName: "tenant_a_user_a" });

    assert.equal(byIdentity.profileName, "tenant_a_user_a");
    assert.equal(byName.profileName, "tenant_a_user_a");
    assert.equal(JSON.stringify(byIdentity).includes("profile-static-secret"), false);
    assert.equal(JSON.stringify(byName).includes("profile-static-secret"), false);
  });

  test("Hades bootstrap returns profile edge route only and never browser-visible Hermes API auth", async () => {
    const { createHermesProfileSessionBroker } = await loadProfileSessionBroker();
    const broker = createHermesProfileSessionBroker({
      auth: {
        verifySupabaseJwt: async (jwt) => {
          assert.equal(jwt, "supabase-user-jwt");
          return { userId: "user_a", tenantId: "tenant_a" };
        },
      },
      profileRegistry: {
        ensureProfile: async ({ userId, tenantId }) => ({
          userId,
          tenantId,
          profileName: "tenant_a_user_a",
          hermesHome: "/srv/hermes/profiles/tenant_a_user_a",
          apiBaseUrl: "https://hermes-router.test/profiles/tenant_a_user_a",
          edgeBaseUrl: "https://app.test/hermes/tenant_a_user_a/v1",
        }),
      },
      profileRouter: {
        publicRouteForProfile: async ({ profileName }) => {
          assert.equal(profileName, "tenant_a_user_a");
          return {
            hermesApiBaseUrl: "https://app.test/hermes/tenant_a_user_a/v1",
            authMode: "edge_injected",
          };
        },
      },
      routingToken: {
        issueTask: async ({ userId, tenantId, profileName }) => ({
          taskId: "session_task_a",
          routingToken: `route.${tenantId}.${userId}.${profileName}`,
        }),
      },
    });

    const session = await broker.startSession({ supabaseJwt: "supabase-user-jwt" });

    assert.equal(session.profileName, "tenant_a_user_a");
    assert.equal(session.hermesApiBaseUrl, "https://app.test/hermes/tenant_a_user_a/v1");
    assert.equal(session.authMode, "edge_injected");
    assert.equal(session.routingToken, "route.tenant_a.user_a.tenant_a_user_a");
    assert.equal(Object.hasOwn(session, "hermesApiHeaders"), false);
    assert.equal(Object.hasOwn(session, "apiServerKey"), false);
    assert.equal(JSON.stringify(session).includes("supabase-user-jwt"), false);
    assert.equal(JSON.stringify(session).includes("API_SERVER_KEY"), false);
    assert.equal(JSON.stringify(session).includes("profile-static-secret"), false);
  });

  test("profile provisioner uses Hermes CLI lifecycle and enforces per-profile HOME/API server settings", async () => {
    const { createHermesProfileProvisioner } = await loadProfileProvisioner();
    const commands = [];
    const files = new Map();
    const provisioner = createHermesProfileProvisioner({
      hermesBin: "hermes",
      profilesRoot: "/srv/hermes/profiles",
      run: async (command) => {
        commands.push(command);
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      writeFile: async (filePath, content) => files.set(filePath.replace(/\\/g, "/"), content),
      allocatePort: async () => 8657,
      generateApiServerKey: () => "profile-static-secret",
    });

    const profile = await provisioner.ensureProfile({
      userId: "user_a",
      tenantId: "tenant_a",
      model: "openrouter/horizon",
      provider: "openrouter",
    });

    assert.equal(profile.profileName, "tenant_a_user_a");
    assert.equal(profile.apiBaseUrl, "http://127.0.0.1:8657");
    assert.ok(commands.some((command) => /hermes\s+profile\s+create\s+tenant_a_user_a/.test(command)));

    const writtenConfig = Array.from(files.values()).join("\n");
    assert.match(writtenConfig, /terminal:/);
    assert.match(writtenConfig, /home_mode:\s*profile/);
    assert.match(writtenConfig, /API_SERVER_ENABLED=true/);
    assert.match(writtenConfig, /API_SERVER_HOST=127\.0\.0\.1/);
    assert.match(writtenConfig, /API_SERVER_PORT=8657/);
    assert.match(writtenConfig, /API_SERVER_KEY=profile-static-secret/);
    assert.doesNotMatch(writtenConfig, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.doesNotMatch(writtenConfig, /SUPABASE_JWT_SECRET/);
    assert.equal(JSON.stringify(profile).includes("profile-static-secret"), false);
    assert.ok(profile.apiServerKeyHash);
    assert.equal(profile.apiServerKey, "profile-static-secret");
    assert.equal(Object.keys(profile).includes("apiServerKey"), false);
  });

  test("profile provisioner sanitizes tenant/user identifiers before CLI and filesystem use", async () => {
    const { createHermesProfileProvisioner } = await loadProfileProvisioner();
    const commands = [];
    const files = new Map();
    const provisioner = createHermesProfileProvisioner({
      hermesBin: "hermes",
      profilesRoot: "/srv/hermes/profiles",
      run: async (command) => {
        commands.push(command);
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      writeFile: async (filePath, content) => files.set(filePath.replace(/\\/g, "/"), content),
      allocatePort: async () => 8658,
      generateApiServerKey: () => "profile-static-secret",
    });

    const profile = await provisioner.ensureProfile({
      tenantId: "tenant; rm -rf /",
      userId: "../user $(whoami)",
    });

    assert.match(profile.profileName, /^[a-z0-9_]+$/);
    assert.doesNotMatch(profile.profileName, /\.\.|;|\$|\(|\)|\/|\\|\s/);

    const commandText = commands.join("\n");
    assert.doesNotMatch(commandText, /rm\s+-rf|whoami|\.\.|\$|\(|\)|;|&&|\|\|/);
    assert.match(commandText, /hermes\s+profile\s+create\s+[a-z0-9_]+/);

    for (const writtenPath of files.keys()) {
      assert.doesNotMatch(writtenPath, /\.\.|;|\$|\(|\)|\s/);
    }

    const writtenConfig = Array.from(files.values()).join("\n");
    assert.match(writtenConfig, /API_SERVER_HOST=127\.0\.0\.1/);
    assert.doesNotMatch(writtenConfig, /API_SERVER_HOST=0\.0\.0\.0/);
    assert.doesNotMatch(writtenConfig, /API_SERVER_CORS_ORIGINS=\*/);
  });

  test("profile router returns public edge route separately from internal loopback target", async () => {
    const { createHermesProfileRouter } = await loadProfileRouter();
    const router = createHermesProfileRouter({
      publicBaseUrl: "https://app.test/hermes",
      registry: {
        findProfile: async ({ profileName }) => ({
          profileName,
          apiHost: "127.0.0.1",
          apiPort: 8657,
          apiServerKeyHash: "sha256:redacted",
        }),
      },
    });

    const publicRoute = await router.publicRouteForProfile({ profileName: "tenant_a_user_a" });
    const internalTarget = await router.internalTargetForProfile({ profileName: "tenant_a_user_a" });

    assert.equal(publicRoute.hermesApiBaseUrl, "https://app.test/hermes/tenant_a_user_a/v1");
    assert.equal(publicRoute.authMode, "edge_injected");
    assert.equal(Object.hasOwn(publicRoute, "apiServerKey"), false);
    assert.equal(internalTarget.baseUrl, "http://127.0.0.1:8657");
    assert.equal(internalTarget.apiServerKeyHash, "sha256:redacted");
    assert.equal(Object.hasOwn(internalTarget, "apiServerKey"), false);
    assert.notEqual(publicRoute.hermesApiBaseUrl, internalTarget.baseUrl);
  });

  test("edge auth proxy strips browser Authorization and injects API_SERVER_KEY only server-side", async () => {
    const { createHermesEdgeAuthProxy } = await loadEdgeAuthProxy();
    const forwarded = [];
    const proxy = createHermesEdgeAuthProxy({
      auth: {
        verifyEdgeRequest: async ({ headers, profileName }) => {
          assert.equal(profileName, "tenant_a_user_a");
          assert.equal(headers.authorization, "Bearer supabase-user-jwt");
          return { userId: "user_a", tenantId: "tenant_a" };
        },
      },
      profileRouter: {
        internalTargetForProfile: async ({ profileName }) => ({
          profileName,
          baseUrl: "http://127.0.0.1:8657",
        }),
      },
      apiServerKeyVault: {
        getApiServerKey: async ({ profileName }) => {
          assert.equal(profileName, "tenant_a_user_a");
          return "profile-static-secret";
        },
      },
      fetch: async (url, init) => {
        forwarded.push({ url, init });
        return {
          status: 200,
          headers: new Map([["content-type", "text/event-stream"]]),
          body: "event: done\n\n",
        };
      },
    });

    const response = await proxy.forward({
      profileName: "tenant_a_user_a",
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        authorization: "Bearer supabase-user-jwt",
        "content-type": "application/json",
        accept: "text/event-stream",
        "x-hermes-session-id": "transcript-alpha",
        "x-hermes-session-key": "agent:main:webui:dm:user-42",
      },
      body: '{"messages":[]}',
    });

    assert.equal(response.status, 200);
    assert.equal(forwarded.length, 1);
    assert.equal(forwarded[0].url, "http://127.0.0.1:8657/v1/chat/completions");
    assert.equal(forwarded[0].init.headers.authorization, "Bearer profile-static-secret");
    assert.equal(forwarded[0].init.headers.accept, "text/event-stream");
    assert.equal(forwarded[0].init.headers["x-hermes-session-id"], "transcript-alpha");
    assert.equal(forwarded[0].init.headers["x-hermes-session-key"], "agent:main:webui:dm:user-42");
    assert.equal(JSON.stringify(response).includes("profile-static-secret"), false);
  });

  test("edge auth proxy fails closed when profile API server is unavailable", async () => {
    const { createHermesEdgeAuthProxy } = await loadEdgeAuthProxy();
    const proxy = createHermesEdgeAuthProxy({
      auth: {
        verifyEdgeRequest: async () => ({ userId: "user_a", tenantId: "tenant_a" }),
      },
      profileRouter: {
        internalTargetForProfile: async () => ({
          profileName: "tenant_a_user_a",
          baseUrl: "http://127.0.0.1:8657",
        }),
      },
      apiServerKeyVault: {
        getApiServerKey: async () => "profile-static-secret",
      },
      fetch: async () => {
        throw new Error("ECONNREFUSED");
      },
    });

    const response = await proxy.forward({
      profileName: "tenant_a_user_a",
      path: "/v1/responses",
      method: "POST",
      headers: { authorization: "Bearer supabase-user-jwt" },
      body: '{"input":"hello"}',
    });

    assert.equal(response.status, 503);
    assert.equal(JSON.stringify(response).includes("edge_ready"), false);
    assert.equal(JSON.stringify(response).includes("profile-static-secret"), false);
  });
});

describe("Hermes per-user profile state persistence", () => {
  test("Railway mode requires profile homes to live under the persistent volume mount", async () => {
    const { createHermesProfileStatePersistence } = await loadProfileStatePersistence();

    assert.throws(
      () =>
        createHermesProfileStatePersistence({
          platform: "railway",
          profilesRoot: "/app/.hermes/profiles",
          railwayVolumeMountPath: "/data",
        }),
      /persistent|volume|railway|HERMES_PROFILES_ROOT/i
    );

    const persistence = createHermesProfileStatePersistence({
      platform: "railway",
      profilesRoot: "/data/hermes/profiles",
      railwayVolumeMountPath: "/data",
    });

    const home = persistence.resolveProfileHome({
      tenantId: "tenant_a",
      userId: "user_a",
      profileName: "tenant_a_user_a",
    });

    assert.equal(home.replace(/\\/g, "/"), "/data/hermes/profiles/tenant_a_user_a");
    assert.doesNotMatch(home, /\.\.|;|\$|\(|\)|\s/);
  });

  test("profile state snapshots are per-user, restorable, and exclude raw secrets", async () => {
    const { createHermesProfileStatePersistence } = await loadProfileStatePersistence();
    const stored = [];
    const files = new Map([
      ["state.db", "sqlite-state"],
      ["sessions/session-a.json", '{"messages":["hello"]}'],
      ["memories/user.md", "likes careful architecture"],
      [".env", "API_SERVER_KEY=profile-static-secret\nTELEGRAM_BOT_TOKEN=raw-token"],
      ["logs/gateway.log", "ok"],
    ]);
    const persistence = createHermesProfileStatePersistence({
      platform: "railway",
      profilesRoot: "/data/hermes/profiles",
      railwayVolumeMountPath: "/data",
      filesystem: {
        readTree: async ({ root }) =>
          Array.from(files.entries()).map(([relativePath, content]) => ({
            root,
            relativePath,
            content,
          })),
        writeTree: async ({ root, entries }) => {
          stored.push({ restoredRoot: root, entries });
        },
      },
      objectStore: {
        putJson: async ({ key, value }) => {
          stored.push({ key, value });
          return { key, etag: "snapshot-etag" };
        },
        getJson: async ({ key }) => stored.find((entry) => entry.key === key)?.value,
      },
    });

    // Snapshot uses fixed latest key
    const snapshot = await persistence.snapshotProfile({
      tenantId: "tenant_a",
      userId: "user_a",
      profileName: "tenant_a_user_a",
      reason: "pre-restart",
    });

    assert.equal(snapshot.objectKey, "profiles/tenant_a/users/user_a/tenant_a_user_a/snapshot.json");
    assert.equal(snapshot.visibility, "private");
    assert.equal(Object.hasOwn(snapshot, "signedUrl"), false);
    assert.equal(Object.hasOwn(snapshot, "publicUrl"), false);
    assert.equal(snapshot.secretStripped, true);
    assert.deepEqual(snapshot.includes.sort(), ["memories/", "sessions/", "state.db"].sort());
    assert.equal(JSON.stringify(snapshot).includes("profile-static-secret"), false);
    assert.equal(JSON.stringify(snapshot).includes("TELEGRAM_BOT_TOKEN"), false);
    assert.equal(JSON.stringify(stored).includes("profile-static-secret"), false);
    assert.equal(JSON.stringify(stored).includes("raw-token"), false);

    // Restore without explicit objectKey reads latest snapshot
    await persistence.restoreProfile({
      tenantId: "tenant_a",
      userId: "user_a",
      profileName: "tenant_a_user_a",
    });

    const restore = stored.find((entry) => entry.restoredRoot);
    assert.equal(restore.restoredRoot, "/data/hermes/profiles/tenant_a_user_a");
    assert.ok(restore.entries.some((entry) => entry.relativePath === "state.db"));
    assert.ok(restore.entries.some((entry) => entry.relativePath.startsWith("sessions/")));
    assert.equal(JSON.stringify(restore).includes(".env"), false);
  });

  test("snapshot overwrites previous snapshot data (no accumulation)", async () => {
    const { createHermesProfileStatePersistence } = await loadProfileStatePersistence();
    const storedKeys = [];
    const files = () => new Map([
      ["state.db", "sqlite-state-v1"],
      ["memories/user.md", "memory-v1"],
    ]);
    const persistence = createHermesProfileStatePersistence({
      platform: "railway",
      profilesRoot: "/data/hermes/profiles",
      railwayVolumeMountPath: "/data",
      filesystem: {
        readTree: async ({ root }) =>
          Array.from(files().entries()).map(([relativePath, content]) => ({
            root, relativePath, content,
          })),
      },
      objectStore: {
        putJson: async ({ key, value }) => { storedKeys.push(key); return { key, etag: "etag" }; },
        getJson: async ({ key }) => null,
      },
    });

    await persistence.snapshotProfile({ tenantId: "t", userId: "u", profileName: "p" });
    await persistence.snapshotProfile({ tenantId: "t", userId: "u", profileName: "p" });

    // Only one key stored — second overwrites the first
    assert.equal(storedKeys.length, 2);
    assert.equal(storedKeys[0], storedKeys[1]);
    assert.equal(storedKeys[0], "profiles/t/users/u/p/snapshot.json");
  });

  test("restore without objectKey reads latest snapshot", async () => {
    const { createHermesProfileStatePersistence } = await loadProfileStatePersistence();
    const snapshotData = {};
    const writtenFiles = [];
    const files = new Map([
      ["state.db", "sqlite-data"],
      ["memories/memory.md", "persistent memory"],
    ]);
    const persistence = createHermesProfileStatePersistence({
      platform: "railway",
      profilesRoot: "/data/hermes/profiles",
      railwayVolumeMountPath: "/data",
      filesystem: {
        readTree: async ({ root }) =>
          Array.from(files.entries()).map(([relativePath, content]) => ({
            root, relativePath, content,
          })),
        writeTree: async ({ root, entries }) => { writtenFiles.push({ root, entries }); },
      },
      objectStore: {
        putJson: async ({ key, value }) => { snapshotData[key] = value; return { key, etag: "etag" }; },
        getJson: async ({ key }) => snapshotData[key] || null,
      },
    });

    // Snapshot once
    await persistence.snapshotProfile({ tenantId: "t", userId: "u", profileName: "p", reason: "test" });

    // Restore without objectKey
    const result = await persistence.restoreProfile({ tenantId: "t", userId: "u", profileName: "p" });

    assert.equal(result.restored, 2);
    assert.equal(writtenFiles.length, 1);
    assert.equal(writtenFiles[0].root, "/data/hermes/profiles/p");
    assert.ok(writtenFiles[0].entries.some((e) => e.relativePath === "state.db"));
    assert.ok(writtenFiles[0].entries.some((e) => e.relativePath === "memories/memory.md"));
  });

  test("snapshot+restore roundtrip survives process restart (end-to-end)", async () => {
    const { createHermesProfileStatePersistence } = await loadProfileStatePersistence();
    const snapshotData = {};

    // Phase 1: agent works and snapshots
    const filesBefore = new Map([
      ["state.db", "session-data"],
      ["memories/note.md", "user said something important"],
      ["sessions/last.json", '{"id":"conv-1"}'],
      [".env", "SECRET=should-not-survive"],
    ]);
    const persistence1 = createHermesProfileStatePersistence({
      platform: "railway",
      profilesRoot: "/data/hermes/profiles",
      railwayVolumeMountPath: "/data",
      filesystem: {
        readTree: async ({ root }) =>
          Array.from(filesBefore.entries()).map(([relativePath, content]) => ({
            root, relativePath, content,
          })),
      },
      objectStore: {
        putJson: async ({ key, value }) => { snapshotData[key] = value; return { key, etag: "etag" }; },
        getJson: async ({ key }) => snapshotData[key] || null,
      },
    });

    const snapshot = await persistence1.snapshotProfile({
      tenantId: "t", userId: "u", profileName: "p", reason: "shutdown",
    });
    assert.ok(snapshot.secretStripped);

    // Phase 2: process restarts, new persistence instance restores
    const restoredFiles = [];
    const persistence2 = createHermesProfileStatePersistence({
      platform: "railway",
      profilesRoot: "/data/hermes/profiles",
      railwayVolumeMountPath: "/data",
      filesystem: {
        writeTree: async ({ root, entries }) => { restoredFiles.push({ root, entries }); },
      },
      objectStore: {
        getJson: async ({ key }) => snapshotData[key] || null,
        putJson: async () => { throw new Error("should not write during restore"); },
      },
    });

    const result = await persistence2.restoreProfile({ tenantId: "t", userId: "u", profileName: "p" });
    assert.equal(result.restored, 3, "state.db + memories/ + sessions/ restored");
    assert.equal(restoredFiles.length, 1);
    const restoredEntries = restoredFiles[0].entries.map((e) => e.relativePath);
    assert.ok(restoredEntries.includes("state.db"));
    assert.ok(restoredEntries.includes("memories/note.md"));
    assert.ok(restoredEntries.includes("sessions/last.json"));
    assert.ok(!restoredEntries.some((p) => p.includes(".env")), "secrets not restored");

    // Memory content is intact
    const memoryEntry = restoredFiles[0].entries.find((e) => e.relativePath === "memories/note.md");
    assert.equal(memoryEntry.content, "user said something important");
  });

  test("restore with no snapshot returns zero restored", async () => {
    const { createHermesProfileStatePersistence } = await loadProfileStatePersistence();
    const persistence = createHermesProfileStatePersistence({
      platform: "railway",
      profilesRoot: "/data/hermes/profiles",
      railwayVolumeMountPath: "/data",
      objectStore: {
        getJson: async ({ key }) => null,
        putJson: async () => { throw new Error("should not write"); },
      },
    });

    const result = await persistence.restoreProfile({ tenantId: "t", userId: "u", profileName: "p" });
    assert.equal(result.restored, 0);
  });

  test("snapshot key includes userId for isolation between users", async () => {
    const { createHermesProfileStatePersistence } = await loadProfileStatePersistence();
    const keys = [];
    const persistence = createHermesProfileStatePersistence({
      platform: "railway",
      profilesRoot: "/data/hermes/profiles",
      railwayVolumeMountPath: "/data",
      filesystem: { readTree: async () => [] },
      objectStore: {
        putJson: async ({ key, value }) => { keys.push(key); return { key, etag: "etag" }; },
        getJson: async () => null,
      },
    });

    await persistence.snapshotProfile({ tenantId: "tenant_x", userId: "alice", profileName: "alice_pro" });
    await persistence.snapshotProfile({ tenantId: "tenant_x", userId: "bob", profileName: "bob_pro" });

    assert.equal(keys.length, 2);
    assert.match(keys[0], /users\/alice\//);
    assert.match(keys[1], /users\/bob\//);
    assert.notEqual(keys[0], keys[1]);
  });
});

describe("Boundary action resilience when Hades is down", () => {
  test("boundary broker snapshots approval requests and continues when Hades approval endpoint is unavailable", async () => {
    const { createHermesBoundaryActionBroker } = await loadBoundaryActionBroker();
    const queued = [];
    const broker = createHermesBoundaryActionBroker({
      routing: {
        verifyResponse: async () => ({
          userId: "user_a",
          tenantId: "tenant_a",
          destination: { provider: "telegram", chatId: "chat_a" },
        }),
      },
      capabilityEnvelope: {
        can: () => false,
        requiresApproval: (capability) => capability === "telegram.send",
      },
      approvalRepository: {
        create: async () => {
          throw Object.assign(new Error("Hades approval endpoint unavailable"), { code: "hades_down" });
        },
      },
      pendingBoundaryActionQueue: {
        enqueue: async (request) => {
          queued.push(request);
          return { id: "queued_1", status: "queued" };
        },
      },
      stateStore: {
        snapshotPendingBoundaryAction: async (request) => {
          queued.push({ snapshot: true, ...request });
          return { objectKey: "tenants/tenant_a/users/user_a/hermes/pending/queued_1.json" };
        },
      },
    });

    const result = await broker.handleProposedActions({
      taskId: "task_a",
      routingToken: "token_a",
      processId: "proc_a",
      actions: [{ type: "telegram.send", text: "needs approval" }],
    });

    assert.equal(result.status, "queued_for_retry");
    assert.ok(queued.some((entry) => entry.snapshot));
    assert.ok(queued.some((entry) => entry.action?.type === "telegram.send"));
  });
});
