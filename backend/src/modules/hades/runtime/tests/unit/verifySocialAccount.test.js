import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

async function loadModule() {
  try {
    return await import("../../verifySocialAccount.js");
  } catch (error) {
    throw new Error("Missing verifySocialAccount.js", { cause: error });
  }
}

describe("verifySocialAccount", () => {
  let discordConnections;
  let telegramConnections;
  let verifySocialAccount;

  beforeEach(async () => {
    discordConnections = {
      findByDiscordUserId: async () => null,
    };
    telegramConnections = {
      findByTelegramUserId: async () => null,
    };
    const mod = await loadModule();
    verifySocialAccount = mod.createVerifySocialAccount({
      discordConnections,
      telegramConnections,
    });
  });

  test("verifies Discord account linked to a Hades user", async () => {
    discordConnections.findByDiscordUserId = async () => ({
      id: "discord_conn_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      status: "connected",
    });

    const result = await verifySocialAccount({
      provider: "discord",
      accountId: "discord_123",
    });

    assert.deepEqual(result, {
      connectionId: "discord_conn_a",
      userId: "user_a",
      tenantId: "tenant_a",
      provider: "discord",
    });
  });

  test("rejects unknown Discord account", async () => {
    const result = await verifySocialAccount({
      provider: "discord",
      accountId: "missing",
    });

    assert.deepEqual(result, {
      ok: false,
      code: "unknown_social_account",
    });
  });

  test("rejects inactive Discord connection", async () => {
    discordConnections.findByDiscordUserId = async () => ({
      id: "discord_conn_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      status: "revoked",
    });

    const result = await verifySocialAccount({
      provider: "discord",
      accountId: "discord_123",
    });

    assert.deepEqual(result, {
      ok: false,
      code: "inactive_connection",
    });
  });

  test("verifies Telegram account linked to a Hades user", async () => {
    telegramConnections.findByTelegramUserId = async () => ({
      id: "telegram_conn_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      status: "connected",
    });

    const result = await verifySocialAccount({
      provider: "telegram",
      accountId: "tg_123",
    });

    assert.deepEqual(result, {
      connectionId: "telegram_conn_a",
      userId: "user_a",
      tenantId: "tenant_a",
      provider: "telegram",
    });
  });

  test("rejects unknown Telegram account", async () => {
    const result = await verifySocialAccount({
      provider: "telegram",
      accountId: "missing",
    });

    assert.deepEqual(result, {
      ok: false,
      code: "unknown_social_account",
    });
  });

  test("rejects inactive Telegram connection", async () => {
    telegramConnections.findByTelegramUserId = async () => ({
      id: "telegram_conn_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      status: "token_revoked",
    });

    const result = await verifySocialAccount({
      provider: "telegram",
      accountId: "tg_123",
    });

    assert.deepEqual(result, {
      ok: false,
      code: "inactive_connection",
    });
  });

  test("rejects unsupported provider", async () => {
    const result = await verifySocialAccount({
      provider: "mastodon",
      accountId: "m_123",
    });

    assert.deepEqual(result, {
      ok: false,
      code: "unsupported_provider",
    });
  });
});
