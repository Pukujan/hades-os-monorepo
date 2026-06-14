import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadTestRuntime() {
  try {
    return await import("../../testUtils/createHadesTestRuntime.js");
  } catch (error) {
    throw new Error("Missing createHadesTestRuntime.js", { cause: error });
  }
}

describe("multi-user isolation regression suite", () => {
  test("User A cannot read User B minion", async () => {
    const { createHadesTestRuntime } = await loadTestRuntime();
    const app = await createHadesTestRuntime();

    await app.minions.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "minion_b", name: "B Minion" },
    });

    const result = await app.minions.findById({
      id: "minion_b",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assert.equal(result, null);
  });

  test("User A cannot update User B minion", async () => {
    const { createHadesTestRuntime } = await loadTestRuntime();
    const app = await createHadesTestRuntime();

    await app.minions.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "minion_b", name: "B Minion" },
    });

    const result = await app.minions.update({
      id: "minion_b",
      userId: "user_a",
      tenantId: "tenant_a",
      patch: { name: "Hijacked" },
    });

    assert.equal(result, null);
  });

  test("User A cannot delete User B minion", async () => {
    const { createHadesTestRuntime } = await loadTestRuntime();
    const app = await createHadesTestRuntime();

    await app.minions.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "minion_b", name: "B Minion" },
    });

    const deleted = await app.minions.delete({
      id: "minion_b",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assert.equal(deleted, false);
  });

  test("User A cannot read User B assignment", async () => {
    const { createHadesTestRuntime } = await loadTestRuntime();
    const app = await createHadesTestRuntime();

    await app.assignments.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: {
        id: "assign_b",
        minion_id: "minion_b",
        provider: "discord",
        command_name: "!catgif",
        status: "active",
      },
    });

    const assignment = await app.assignments.findActiveAssignment({
      userId: "user_a",
      tenantId: "tenant_a",
      provider: "discord",
      commandName: "!catgif",
    });

    assert.equal(assignment, null);
  });

  test("User A cannot use User B Discord connection", async () => {
    const { createHadesTestRuntime } = await loadTestRuntime();
    const app = await createHadesTestRuntime();

    await app.discordConnections.createOrUpdate({
      userId: "user_b",
      tenantId: "tenant_b",
      discordUserId: "discord_b",
      guildId: "guild_b",
      channelId: "channel_b",
      status: "connected",
    });

    const result = await app.verifySocialAccount({
      provider: "discord",
      accountId: "discord_a",
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "unknown_social_account");
  });

  test("User A cannot use User B Telegram token", async () => {
    const { createHadesTestRuntime } = await loadTestRuntime();
    const app = await createHadesTestRuntime();

    await app.telegramConnections.createOrUpdate({
      userId: "user_b",
      tenantId: "tenant_b",
      telegramUserId: "tg_b",
      botToken: "999:SECRET",
      botUsername: "b_bot",
      status: "connected",
    });

    const result = await app.verifySocialAccount({
      provider: "telegram",
      accountId: "tg_a",
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "unknown_social_account");
  });

  test("User A trigger cannot execute User B minion", async () => {
    const { createHadesTestRuntime } = await loadTestRuntime();
    const app = await createHadesTestRuntime();

    await app.minions.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "minion_b", name: "B Cat Minion" },
    });

    await app.assignments.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: {
        id: "assign_b",
        minion_id: "minion_b",
        provider: "discord",
        command_name: "!catgif",
        status: "active",
      },
    });

    await app.discordConnections.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      discordUserId: "discord_a",
      guildId: "guild_a",
      channelId: "channel_a",
      status: "connected",
    });

    const result = await app.runtime.handleSocialTrigger({
      provider: "discord",
      accountId: "discord_a",
      channelId: "channel_a",
      content: "!catgif",
      commandName: "!catgif",
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "no_assigned_minion");
  });

  test("User A Hermes context does not include User B memory", async () => {
    const { createHadesTestRuntime } = await loadTestRuntime();
    const app = await createHadesTestRuntime();

    await app.memory.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "mem_b", content: "User B private memory" },
    });

    const context = await app.buildContextForUser({
      userId: "user_a",
      tenantId: "tenant_a",
      trigger: { content: "hello" },
    });

    assert.ok(!JSON.stringify(context).includes("User B private memory"));
  });

  test("User A execution logs do not include User B payload", async () => {
    const { createHadesTestRuntime } = await loadTestRuntime();
    const app = await createHadesTestRuntime();

    await app.executions.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: {
        id: "exec_b",
        payload: { content: "B private payload" },
        status: "sent",
      },
    });

    const logs = await app.executions.listByUser({
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assert.ok(!JSON.stringify(logs).includes("B private payload"));
  });

  test("cache key for User A cannot return User B context", async () => {
    const { createHadesTestRuntime } = await loadTestRuntime();
    const app = await createHadesTestRuntime();

    await app.contextCache.set({
      userId: "user_b",
      tenantId: "tenant_b",
      key: "recent_context",
      value: { memory: "B cached memory" },
    });

    const cached = await app.contextCache.get({
      userId: "user_a",
      tenantId: "tenant_a",
      key: "recent_context",
    });

    assert.equal(cached, null);
  });
});
