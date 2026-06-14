import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadModule() {
  try {
    return await import("../../index.js");
  } catch (error) {
    throw new Error(
      "Missing module index.js — expected at ../../index.js",
      { cause: error }
    );
  }
}

describe("Hades module wiring", () => {
  test("register() creates all required service factories without throwing", async () => {
    const mod = await loadModule();
    assert.equal(typeof mod.register, "function");

    const mockApp = { use: () => {} };
    const mockContext = {};

    const result = await mod.register(mockApp, mockContext);
    assert.ok(result, "register() should return a detail object");
    assert.ok(result.detail, "result should have a detail string");
    assert.ok(Array.isArray(result.children), "result should have children array");
  });

  test("register wires discordHermesCommandFlow without error", async () => {
    const mod = await loadModule();
    const mockApp = { use: () => {} };
    const mockContext = {};

    await assert.doesNotReject(() =>
      mod.register(mockApp, mockContext)
    );
  });

  test("register wires telegramClient and botTokenProvider without error", async () => {
    const mod = await loadModule();
    const mockApp = { use: () => {} };
    const mockContext = {};

    const result = await mod.register(mockApp, mockContext);
    assert.ok(result.detail, "register should return detail");
  });
});

async function loadTelegramClient() {
  try {
    return await import("../../services/telegramClient.js");
  } catch (error) {
    throw new Error(
      "Missing Telegram client — expected at ../../services/telegramClient.js",
      { cause: error }
    );
  }
}

async function loadBotTokenProvider() {
  try {
    return await import("../../services/botTokenProvider.js");
  } catch (error) {
    throw new Error(
      "Missing bot token provider — expected at ../../services/botTokenProvider.js",
      { cause: error }
    );
  }
}

describe("Telegram service wiring", () => {
  test("telegramClient can be instantiated without API", async () => {
    const { createTelegramClient } = await loadTelegramClient();
    await assert.rejects(
      () => createTelegramClient({ botToken: "" }),
      /bot token|not configured|invalid|telegram/i
    );
  });

  test("botTokenProvider can be instantiated without repository", async () => {
    const { createBotTokenProvider } = await loadBotTokenProvider();
    const provider = createBotTokenProvider({
      findSocialConnection: async () => null,
    });
    assert.equal(typeof provider.getBotToken, "function");
  });
});
