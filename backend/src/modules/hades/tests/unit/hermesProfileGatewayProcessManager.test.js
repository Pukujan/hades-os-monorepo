import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHermesProfileGatewayProcessManager } from "../../runtime/hermesProfileGatewayProcessManager.js";
import { createHermesProfileSessionBroker } from "../../runtime/hermesProfileSessionBroker.js";

describe("Hermes profile gateway process manager", () => {
  test("does not spawn when the profile API server is already healthy", async () => {
    let spawned = false;
    let receivedInit = null;
    const manager = createHermesProfileGatewayProcessManager({
      fetch: async (url, init) => {
        assert.equal(url, "http://127.0.0.1:8657/health");
        receivedInit = init;
        return { ok: true };
      },
      spawn: async () => {
        spawned = true;
      },
    });

    const result = await manager.ensureGateway({
      profileName: "tenant_user",
      apiBaseUrl: "http://127.0.0.1:8657",
      apiServerKey: "profile-static-secret",
    });

    assert.equal(result.gatewayStatus, "running");
    assert.equal(result.spawned, false);
    assert.equal(spawned, false);
    assert.equal(receivedInit.headers.authorization, "Bearer profile-static-secret");
    assert.equal(JSON.stringify(result).includes("profile-static-secret"), false);
  });

  test("spawns hermes profile gateway and waits for health", async () => {
    const healthResults = [false, true];
    const spawns = [];
    const manager = createHermesProfileGatewayProcessManager({
      hermesBin: "hermes-test",
      hermesHome: "/tmp/hades-hermes",
      env: { PATH: "/bin" },
      healthTimeoutMs: 10,
      healthPollMs: 0,
      fetch: async () => ({ ok: healthResults.shift() ?? true }),
      spawn: async (command, args, options) => {
        spawns.push({ command, args, options });
        return { unref() {}, on() {} };
      },
    });

    const result = await manager.ensureGateway({
      profileName: "tenant_user",
      apiBaseUrl: "http://127.0.0.1:8658",
    });

    assert.equal(result.gatewayStatus, "running");
    assert.equal(result.spawned, true);
    assert.equal(spawns[0].command, "hermes-test");
    assert.deepEqual(spawns[0].args, ["-p", "tenant_user", "gateway", "run"]);
    assert.equal(spawns[0].options.env.HERMES_HOME, "/tmp/hades-hermes");
    assert.equal(spawns[0].options.detached, true);
  });
});

describe("Hermes profile session broker gateway readiness", () => {
  test("starts or verifies the profile gateway before returning browser edge route", async () => {
    const calls = [];
    const broker = createHermesProfileSessionBroker({
      auth: {
        verifySupabaseJwt: async () => ({ userId: "user_a", tenantId: "tenant_a" }),
      },
      profileRegistry: {
        ensureProfile: async () => ({
          profileName: "tenant_a_user_a",
          apiBaseUrl: "http://127.0.0.1:8660",
        }),
      },
      profileGatewayManager: {
        ensureGateway: async (profile) => {
          calls.push(profile);
          return { gatewayStatus: "running" };
        },
      },
      profileRouter: {
        publicRouteForProfile: async () => ({
          hermesApiBaseUrl: "/api/hades/hermes/tenant_a_user_a/v1/responses",
          authMode: "edge_injected",
        }),
      },
      routingToken: {
        issueTask: async () => ({ routingToken: "route_123" }),
      },
    });

    const session = await broker.startSession({ supabaseJwt: "jwt", origin: "http://localhost" });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].profileName, "tenant_a_user_a");
    assert.equal(calls[0].apiBaseUrl, "http://127.0.0.1:8660");
    assert.equal(Object.hasOwn(calls[0], "apiServerKey"), false);
    assert.equal(session.gatewayStatus, "running");
    assert.equal(session.hermesApiBaseUrl, "/api/hades/hermes/tenant_a_user_a/v1/responses");
  });
});
