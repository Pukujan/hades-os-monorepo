import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { invokeApp } from "../../../shared/testing/invoke-app.js";
import { createHadesRoutes } from "../routes/hades.routes.js";
import { createHadesRepository } from "../repositories/hades.repository.js";
import { createTelegramConnectionRepository } from "../repositories/telegramConnectionRepository.js";
import { createHadesService } from "../services/hades.service.js";
import { createHermesService } from "../services/hermes.service.js";

describe("live Telegram token crypto", () => {
  let app;
  let telegramConnections;
  let telegramClient;
  let crypto;

  function createTestAuth({ userId, tenantId }) {
    return {
      requireHadesAuth: async () => ({ userId, tenantId, sessionToken: "test" }),
    };
  }

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    telegramClient = {
      getMe: async () => ({ id: "bot_a", username: "hades_bot_a" }),
    };

    crypto = {
      encrypt: (value) => `encrypted:${value}`,
      decrypt: (value) => value.replace("encrypted:", ""),
    };

    telegramConnections = createTelegramConnectionRepository({
      storage: "memory",
      crypto,
    });
  });

  function setupAppForUser(userId, tenantId) {
    const repository = createHadesRepository();
    const hermes = createHermesService({});
    const scopedRepos = { telegramConnections };

    const service = createHadesService({
      repository,
      scopedRepos,
      hermes,
      telegramClientFactory: async () => telegramClient,
    });

    const router = createHadesRoutes({
      service,
      requireHadesAuth: createTestAuth({ userId, tenantId }).requireHadesAuth,
    });

    return router;
  }

  test("saveTelegramToken encrypts before storing", async () => {
    let encryptedValue = null;
    const cryptSpy = {
      encrypt: (value) => {
        encryptedValue = value;
        return `encrypted:${value}`;
      },
      decrypt: (value) => value.replace("encrypted:", ""),
    };

    const localRepo = createTelegramConnectionRepository({
      storage: "memory",
      crypto: cryptSpy,
    });

    const repository = createHadesRepository();
    const hermes = createHermesService({});
    const scopedRepos = { telegramConnections: localRepo };

    const service = createHadesService({
      repository,
      scopedRepos,
      hermes,
      telegramClientFactory: async () => telegramClient,
    });

    const router = createHadesRoutes({
      service,
      requireHadesAuth: createTestAuth({ userId: "user_a", tenantId: "tenant_a" }).requireHadesAuth,
    });

    const localApp = express();
    localApp.use(express.json());
    localApp.use("/api/hades", router);

    await invokeApp(localApp, {
      method: "POST",
      path: "/api/hades/socials/telegram/token",
      headers: { authorization: "Bearer token-a" },
      body: { token: "123456:SECRET_TOKEN" },
    });

    assert.equal(encryptedValue, "123456:SECRET_TOKEN");
  });

  test("public socials response does not expose plaintext token", async () => {
    const router = setupAppForUser("user_a", "tenant_a");
    app.use("/api/hades", router);

    await invokeApp(app, {
      method: "POST",
      path: "/api/hades/socials/telegram/token",
      headers: { authorization: "Bearer token-a" },
      body: { token: "123456:SECRET_TOKEN" },
    });

    const res = await invokeApp(app, {
      method: "GET",
      path: "/api/hades/socials",
      headers: { authorization: "Bearer token-a" },
    });

    assert.equal(res.status, 200);
    const payload = JSON.stringify(JSON.parse(res.body));
    assert.ok(!payload.includes("123456:SECRET_TOKEN"));
  });

  test("public socials response does not expose encrypted token", async () => {
    const router = setupAppForUser("user_a", "tenant_a");
    app.use("/api/hades", router);

    await invokeApp(app, {
      method: "POST",
      path: "/api/hades/socials/telegram/token",
      headers: { authorization: "Bearer token-a" },
      body: { token: "123456:SECRET_TOKEN" },
    });

    const res = await invokeApp(app, {
      method: "GET",
      path: "/api/hades/socials",
      headers: { authorization: "Bearer token-a" },
    });

    assert.equal(res.status, 200);
    const payload = JSON.stringify(JSON.parse(res.body));
    assert.ok(!payload.includes("encrypted:123456:SECRET_TOKEN"));
  });

  test("public socials response may include token_last4", async () => {
    const router = setupAppForUser("user_a", "tenant_a");
    app.use("/api/hades", router);

    await invokeApp(app, {
      method: "POST",
      path: "/api/hades/socials/telegram/token",
      headers: { authorization: "Bearer token-a" },
      body: { token: "123456:SECRET_ABCD" },
    });

    const res = await invokeApp(app, {
      method: "GET",
      path: "/api/hades/socials",
      headers: { authorization: "Bearer token-a" },
    });

    assert.equal(res.status, 200);
    const payload = JSON.stringify(JSON.parse(res.body));
    assert.ok(payload.includes("ABCD"));
  });

  test("fails safely when encryption is unavailable", async () => {
    const unsafeRepo = createTelegramConnectionRepository({
      storage: "memory",
      crypto: null,
    });

    const repository = createHadesRepository();
    const hermes = createHermesService({});
    const scopedRepos = { telegramConnections: unsafeRepo };

    const service = createHadesService({
      repository,
      scopedRepos,
      hermes,
      telegramClientFactory: async () => telegramClient,
    });

    const router = createHadesRoutes({
      service,
      requireHadesAuth: createTestAuth({ userId: "user_a", tenantId: "tenant_a" }).requireHadesAuth,
    });

    const localApp = express();
    localApp.use(express.json());
    localApp.use("/api/hades", router);

    const res = await invokeApp(localApp, {
      method: "POST",
      path: "/api/hades/socials/telegram/token",
      headers: { authorization: "Bearer token-a" },
      body: { token: "123456:SECRET_TOKEN" },
    });

    assert.equal(res.status, 500);
  });
});
