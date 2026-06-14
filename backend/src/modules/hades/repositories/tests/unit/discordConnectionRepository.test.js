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

  beforeEach(async () => {
    const mod = await loadRepo();
    repo = mod.createDiscordConnectionRepository({ storage: "memory" });
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
});
