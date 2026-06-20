import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

async function loadRepo() {
  try {
    return await import("../../discordConnectionRepository.js");
  } catch (error) {
    throw new Error("Missing discordConnectionRepository.js", { cause: error });
  }
}

describe("discordConnectionRepository", () => {
  let repo;
  let crypto;

  beforeEach(async () => {
    crypto = {
      encrypt: (value) => `encrypted:${value}`,
      decrypt: (value) => value.replace("encrypted:", ""),
    };

    const mod = await loadRepo();
    repo = mod.createDiscordConnectionRepository({ storage: "memory", crypto });
  });

  test("stores discord_user_id, guild_id, and channel_id", async () => {
    const record = await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      discordUserId: "discord_123",
      guildId: "guild_1",
      channelId: "channel_1",
      status: "connected",
    });

    assert.equal(record.user_id, "user_a");
    assert.equal(record.tenant_id, "tenant_a");
    assert.equal(record.discord_user_id, "discord_123");
    assert.equal(record.guild_id, "guild_1");
    assert.equal(record.channel_id, "channel_1");
    assert.equal(record.status, "connected");
  });

  test("filters public connection by userId and tenantId", async () => {
    await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      discordUserId: "discord_a",
      guildId: "guild_a",
      channelId: "channel_a",
      status: "connected",
    });
    await repo.saveToken({
      userId: "user_a",
      tenantId: "tenant_a",
      token: "token_a_secret",
    });

    await repo.createOrUpdate({
      userId: "user_b",
      tenantId: "tenant_b",
      discordUserId: "discord_b",
      guildId: "guild_b",
      channelId: "channel_b",
      status: "connected",
    });

    const record = await repo.findPublicByUser({
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assert.equal(record.discord_user_id, "discord_a");
  });

  test("findByDiscordUserId returns connection owner", async () => {
    await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      discordUserId: "discord_a",
      guildId: "guild_a",
      channelId: "channel_a",
      status: "connected",
    });

    const record = await repo.findByDiscordUserId({
      discordUserId: "discord_a",
    });

    assert.equal(record.user_id, "user_a");
    assert.equal(record.tenant_id, "tenant_a");
  });

  test("returns null for unknown discord user", async () => {
    const record = await repo.findByDiscordUserId({
      discordUserId: "missing",
    });

    assert.equal(record, null);
  });

  test("saveToken includes discord_user_id in record", async () => {
    const record = await repo.saveToken({
      userId: "user_a",
      tenantId: "tenant_a",
      token: "discordtokenwxyz",
      discordUserId: "discord_456",
      botUsername: "my_bot",
    });

    assert.equal(record.user_id, "user_a");
    assert.equal(record.tenant_id, "tenant_a");
    assert.equal(record.discord_user_id, "discord_456");
    assert.ok(record.encrypted_bot_token);
    assert.equal(record.token_last4, "wxyz");
    assert.equal(record.bot_username, "my_bot");
    assert.equal(record.status, "connected");
  });

  test("saveToken inherits discord_user_id from existing record", async () => {
    await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      discordUserId: "discord_789",
      guildId: "guild_x",
      channelId: "channel_x",
      status: "connected",
    });

    const record = await repo.saveToken({
      userId: "user_a",
      tenantId: "tenant_a",
      token: "token_456",
    });

    assert.equal(record.discord_user_id, "discord_789");
    assert.equal(record.user_id, "user_a");
    assert.equal(record.tenant_id, "tenant_a");
  });

  test("saveToken allows null discord_user_id when no prior record exists", async () => {
    const record = await repo.saveToken({
      userId: "user_b",
      tenantId: "tenant_b",
      token: "token_789",
    });

    assert.equal(record.user_id, "user_b");
    assert.equal(record.tenant_id, "tenant_b");
    assert.equal(record.discord_user_id, null);
  });

  test("saveToken includes bot_username when passed", async () => {
    const record = await repo.saveToken({
      userId: "user_c",
      tenantId: "tenant_c",
      token: "token_aaa",
      botUsername: "my_discord_bot",
    });

    assert.equal(record.bot_username, "my_discord_bot");
  });

  test("saveToken throws when crypto is missing", async () => {
    const mod = await loadRepo();
    const noCryptoRepo = mod.createDiscordConnectionRepository({ storage: "memory", crypto: null });

    await assert.rejects(
      () => noCryptoRepo.saveToken({ userId: "x", tenantId: "y", token: "secret" }),
      (err) => {
        assert.match(err.message, /crypto/i);
        return true;
      }
    );
  });
});
