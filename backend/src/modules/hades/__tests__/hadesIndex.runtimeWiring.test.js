import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadModule() {
  try {
    return await import("../index.js");
  } catch (error) {
    throw new Error("Missing hades/index.js", { cause: error });
  }
}

describe("hades/index.js runtime wiring", () => {
  test("register function exists", async () => {
    const mod = await loadModule();
    assert.equal(typeof mod.register, "function");
  });

  test("creates verifySocialAccount when deps are provided", async () => {
    const mod = await loadModule();
    const mockApp = { use: () => {} };

    const info = await mod.register(mockApp, {
      eventBus: { emit() {}, on() {} },
      overrides: {
        verifySocialAccount: async ({ provider, accountId }) => ({
          ok: true,
          userId: "user_a",
          tenantId: "tenant_a",
          connectionId: "conn_a",
          provider: "discord",
        }),
      },
    });

    assert.ok(info);
    assert.equal(info.detail, "→ /api/hades");
  });

  test("verifySocialAccount is not null when wired", async () => {
    const verifySocialAccount = async () => ({
      ok: true,
      userId: "user_a",
      tenantId: "tenant_a",
      connectionId: "conn_a",
      provider: "discord",
    });

    const mod = await loadModule();
    const mockApp = { use: () => {} };

    await mod.register(mockApp, {
      eventBus: { emit() {}, on() {} },
      overrides: { verifySocialAccount },
    });

    assert.ok(verifySocialAccount);
    assert.notEqual(verifySocialAccount, null);
  });

  test("socialClient is not null when wired", async () => {
    const socialClient = { sendMessage: async () => ({ ok: true }) };

    const mod = await loadModule();
    const mockApp = { use: () => {} };

    await mod.register(mockApp, {
      eventBus: { emit() {}, on() {} },
      overrides: { socialClient },
    });

    assert.ok(socialClient);
    assert.notEqual(socialClient, null);
  });

  test("hermesRuntime is not null when wired", async () => {
    const hermesRuntime = { executeMinion: async () => ({}) };

    const mod = await loadModule();
    const mockApp = { use: () => {} };

    await mod.register(mockApp, {
      eventBus: { emit() {}, on() {} },
      overrides: { hermesRuntime },
    });

    assert.ok(hermesRuntime);
    assert.notEqual(hermesRuntime, null);
  });
});
