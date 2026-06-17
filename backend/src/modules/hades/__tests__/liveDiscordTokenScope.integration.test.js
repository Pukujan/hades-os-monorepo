import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { invokeApp } from "../../../shared/testing/invoke-app.js";
import { createHadesRoutes } from "../routes/hades.routes.js";
import { createHadesRepository } from "../repositories/hades.repository.js";
import { createDiscordConnectionRepository } from "../repositories/discordConnectionRepository.js";
import { createHadesService } from "../services/hades.service.js";
import { createHermesService } from "../services/hermes.service.js";

describe("live Discord token scope", () => {
  let app;
  let discordConnections;

  function createTestAuth({ userId, tenantId }) {
    return {
      requireHadesAuth: async () => ({ userId, tenantId, sessionToken: "test" }),
    };
  }

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    const crypto = {
      encrypt: (value) => `encrypted:${value}`,
      decrypt: (value) => value.replace("encrypted:", ""),
    };

    discordConnections = createDiscordConnectionRepository({
      storage: "memory",
      crypto,
    });
  });

  function setupAppForUser(userId, tenantId) {
    const repository = createHadesRepository();
    const hermes = createHermesService({});
    const scopedRepos = { discordConnections };

    const service = createHadesService({
      repository,
      scopedRepos,
      hermes,
    });

    const router = createHadesRoutes({
      service,
      requireHadesAuth: createTestAuth({ userId, tenantId }).requireHadesAuth,
    });

    return router;
  }

  test("User A Discord token is saved under User A only", async () => {
    const router = setupAppForUser("user_a", "tenant_a");
    app.use("/api/hades", router);

    const saveRes = await invokeApp(app, {
      method: "POST",
      path: "/api/hades/socials/discord/token",
      headers: { authorization: "Bearer token-a" },
      body: { token: "MTE_DISCORD_TOKEN_A" },
    });

    assert.equal(saveRes.status, 200);

    const listRes = await invokeApp(app, {
      method: "GET",
      path: "/api/hades/socials",
      headers: { authorization: "Bearer token-a" },
    });

    assert.equal(listRes.status, 200);
    const userASocials = JSON.parse(listRes.body);

    const routerB = setupAppForUser("user_b", "tenant_b");
    const appB = express();
    appB.use(express.json());
    appB.use("/api/hades", routerB);

    const listResB = await invokeApp(appB, {
      method: "GET",
      path: "/api/hades/socials",
      headers: { authorization: "Bearer token-b" },
    });

    assert.equal(listResB.status, 200);
    const userBSocials = JSON.parse(listResB.body);

    const payloadA = JSON.stringify(userASocials);
    assert.ok(payloadA.includes("discord"));

    const payloadB = JSON.stringify(userBSocials);
    assert.ok(!payloadB.includes("MTE_DISCORD_TOKEN_A"));
  });

  test("public socials route never returns plaintext or encrypted Discord token", async () => {
    const router = setupAppForUser("user_a", "tenant_a");
    app.use("/api/hades", router);

    await invokeApp(app, {
      method: "POST",
      path: "/api/hades/socials/discord/token",
      headers: { authorization: "Bearer token-a" },
      body: { token: "MTE_DISCORD_TOKEN_A" },
    });

    const res = await invokeApp(app, {
      method: "GET",
      path: "/api/hades/socials",
      headers: { authorization: "Bearer token-a" },
    });

    assert.equal(res.status, 200);
    const payload = JSON.stringify(JSON.parse(res.body));
    assert.ok(!payload.includes("MTE_DISCORD_TOKEN_A"));
    assert.ok(!payload.includes("encrypted:"));
  });
});
