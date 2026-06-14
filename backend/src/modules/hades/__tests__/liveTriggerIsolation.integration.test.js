import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { invokeApp } from "../../../shared/testing/invoke-app.js";
import { createHadesRoutes } from "../routes/hades.routes.js";
import { createMinionRepository } from "../repositories/minionRepository.js";
import { createAssignmentRepository } from "../repositories/assignmentRepository.js";
import { createDiscordConnectionRepository } from "../repositories/discordConnectionRepository.js";
import { createVerifySocialAccount } from "../runtime/verifySocialAccount.js";
import { createMinionAssignmentRuntime } from "../services/minionAssignmentRuntime.service.js";
import { createHadesService } from "../services/hades.service.js";
import { createHadesRepository } from "../repositories/hades.repository.js";
import { createHermesService } from "../services/hermes.service.js";

describe("live trigger isolation", () => {
  let app;
  let discordConnections;
  let minions;
  let assignments;
  let hermesRuntime;
  let socialClient;
  let executionCalls;

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    discordConnections = createDiscordConnectionRepository({ storage: "memory" });
    minions = createMinionRepository({ storage: "memory" });
    assignments = createAssignmentRepository({ storage: "memory" });
    executionCalls = [];

    hermesRuntime = {
      executeMinion: async (args) => {
        executionCalls.push(args);
        return { outboundActions: [{ type: "send_message", content: "cat gif" }] };
      },
    };

    socialClient = {
      sendMessage: async () => ({ ok: true, providerMessageId: "msg_1" }),
    };

    await minions.create({ userId: "user_a", tenantId: "tenant_a", data: { id: "minion_a", name: "A Cat Minion", user_id: "user_a" } });
    await minions.create({ userId: "user_b", tenantId: "tenant_b", data: { id: "minion_b", name: "B Cat Minion", user_id: "user_b" } });

    await assignments.create({ userId: "user_a", tenantId: "tenant_a", data: { id: "assign_a", minion_id: "minion_a", provider: "discord", command_name: "!catgif", status: "active", user_id: "user_a", tenant_id: "tenant_a" } });
    await assignments.create({ userId: "user_b", tenantId: "tenant_b", data: { id: "assign_b", minion_id: "minion_b", provider: "discord", command_name: "!catgif", status: "active", user_id: "user_b", tenant_id: "tenant_b" } });

    await discordConnections.createOrUpdate({ userId: "user_a", tenantId: "tenant_a", discordUserId: "discord_a", guildId: "guild_a", channelId: "channel_a", status: "connected" });
    await discordConnections.createOrUpdate({ userId: "user_b", tenantId: "tenant_b", discordUserId: "discord_b", guildId: "guild_b", channelId: "channel_b", status: "connected" });
  });

  function setupApp() {
    const verifySocialAccount = createVerifySocialAccount({ discordConnections, telegramConnections: { findByTelegramUserId: async () => null } });

    const repository = createHadesRepository();
    const hermes = createHermesService({});

    const scopedRepos = { minions, assignments, discordConnections };

    const appRuntime = createMinionAssignmentRuntime({
      verifySocialAccount,
      repository,
      hermesRuntime,
      socialClient,
      scopedRepos,
    });

    const service = createHadesService({
      repository,
      scopedRepos,
      hermes,
      minionAssignmentRuntime: appRuntime,
    });

    const router = createHadesRoutes({ service });

    return router;
  }

  test("Discord trigger from User A executes only User A minion", async () => {
    const router = setupApp();
    app.use("/api/hades", router);

    const res = await invokeApp(app, {
      method: "POST",
      path: "/api/hades/triggers",
      body: {
        provider: "discord",
        accountId: "discord_a",
        channelId: "channel_a",
        content: "!catgif",
        commandName: "!catgif",
        triggerType: "command",
      },
    });

    assert.equal(res.status, 200);
    const calls = executionCalls;
    assert.ok(calls.length > 0);
    assert.equal(calls[0].context.userId, "user_a");
    assert.equal(calls[0].minion.id, "minion_a");
    assert.ok(!JSON.stringify(calls).includes("user_b"));
    assert.ok(!JSON.stringify(calls).includes("minion_b"));
  });

  test("Discord trigger from User B executes only User B minion", async () => {
    const router = setupApp();
    app.use("/api/hades", router);

    const res = await invokeApp(app, {
      method: "POST",
      path: "/api/hades/triggers",
      body: {
        provider: "discord",
        accountId: "discord_b",
        channelId: "channel_b",
        content: "!catgif",
        commandName: "!catgif",
        triggerType: "command",
      },
    });

    assert.equal(res.status, 200);
    const calls = executionCalls;
    assert.ok(calls.length > 0);
    assert.equal(calls[0].context.userId, "user_b");
    assert.equal(calls[0].minion.id, "minion_b");
  });

  test("unknown social trigger never reaches Hermes", async () => {
    const router = setupApp();
    app.use("/api/hades", router);

    const res = await invokeApp(app, {
      method: "POST",
      path: "/api/hades/triggers",
      body: {
        provider: "discord",
        accountId: "discord_unknown",
        channelId: "channel_x",
        content: "!catgif",
        commandName: "!catgif",
        triggerType: "command",
      },
    });

    assert.equal(res.status, 404);
    const body = JSON.parse(res.body);
    assert.equal(body.code, "unknown_social_account");
    assert.equal(executionCalls.length, 0);
  });
});
