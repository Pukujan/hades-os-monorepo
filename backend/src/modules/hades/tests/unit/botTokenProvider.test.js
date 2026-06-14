import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadBotTokenProvider() {
  try {
    return await import("../../services/botTokenProvider.js");
  } catch (error) {
    throw new Error(
      [
        "Missing bot token provider.",
        "Implement backend/src/modules/hades/services/botTokenProvider.js",
        "and export { createBotTokenProvider }.",
      ].join(" "),
      { cause: error }
    );
  }
}

describe("bot token provider", () => {
  test("retrieves bot token from social connections by user and provider", async () => {
    const { createBotTokenProvider } = await loadBotTokenProvider();
    assert.equal(typeof createBotTokenProvider, "function");

    const provider = createBotTokenProvider({
      findSocialConnection: async ({ userId, provider: prov }) => {
        assert.equal(userId, "user_123");
        assert.equal(prov, "discord");
        return { botToken: "discord-bot-secret-abc" };
      },
    });

    const token = await provider.getBotToken({ userId: "user_123", provider: "discord" });
    assert.equal(token, "discord-bot-secret-abc");
  });

  test("returns null when no social connection exists", async () => {
    const { createBotTokenProvider } = await loadBotTokenProvider();

    const provider = createBotTokenProvider({
      findSocialConnection: async () => null,
    });

    const token = await provider.getBotToken({ userId: "user_unknown", provider: "discord" });
    assert.equal(token, null);
  });

  test("returns null when connection exists but has no bot token", async () => {
    const { createBotTokenProvider } = await loadBotTokenProvider();

    const provider = createBotTokenProvider({
      findSocialConnection: async () => ({ botToken: null }),
    });

    const token = await provider.getBotToken({ userId: "user_123", provider: "discord" });
    assert.equal(token, null);
  });

  test("throws when findSocialConnection is not configured", async () => {
    const { createBotTokenProvider } = await loadBotTokenProvider();

    assert.throws(
      () => createBotTokenProvider({}),
      /findSocialConnection|not configured/i
    );
  });

  test("supports multiple providers", async () => {
    const { createBotTokenProvider } = await loadBotTokenProvider();

    const connections = {
      discord: "discord-token-1",
      telegram: "telegram-token-1",
    };

    const provider = createBotTokenProvider({
      findSocialConnection: async ({ provider: prov }) => ({
        botToken: connections[prov] || null,
      }),
    });

    const discordToken = await provider.getBotToken({ userId: "user_1", provider: "discord" });
    const telegramToken = await provider.getBotToken({ userId: "user_1", provider: "telegram" });
    const unknownToken = await provider.getBotToken({ userId: "user_1", provider: "slack" });

    assert.equal(discordToken, "discord-token-1");
    assert.equal(telegramToken, "telegram-token-1");
    assert.equal(unknownToken, null);
  });
});
