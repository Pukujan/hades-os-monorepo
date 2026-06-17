import { test, describe } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createHadesRoutes } from "../../routes/hades.routes.js";
import { invokeApp } from "../../../../shared/testing/invoke-app.js";

function createApp(overrides = {}) {
  const service = {
    readiness: async () => ({ status: "ok" }),
    bootstrap: async () => ({ userId: "user_123" }),
    chat: async () => ({
      conversationId: "conv_1",
      userMessage: {},
      assistantMessage: {},
      draft: {},
      missingFields: [],
      suggestions: [],
      source: "",
      sessionId: "",
    }),
    testMinion: async () => ({ testRun: { id: "t1" }, draft: {} }),
    saveMinion: async () => ({ minion: { id: "m1" } }),
    assignMinion: async () => ({ assignment: { id: "a1" } }),
    handleTrigger: async () => ({ handled: true }),
    getConversationMessages: async () => [],
    clearMessages: async () => ({ cleared: true }),
    listSocialConnections: async () => [],
    saveTelegramToken: async () => ({}),
    deleteTelegramToken: async () => ({ deleted: true }),
    listMinions: async () => [],
    getMinion: async () => null,
    getMinionLogs: async () => [],
    listNotifications: async () => [],
    updateMinion: async () => null,
    deleteMinion: async () => null,
    ...overrides,
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authContext = { userId: "user_123", tenantId: "tenant_123" };
    next();
  });
  app.use("/api/hades", createHadesRoutes({ service }));
  return app;
}

describe("Telegram social routes", () => {
  test("DELETE /api/hades/socials/telegram/token returns 200", async () => {
    const app = createApp();
    const res = await invokeApp(app, {
      method: "DELETE",
      path: "/api/hades/socials/telegram/token",
    });
    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.deleted, true);
  });

  test("DELETE /api/hades/socials/telegram/token returns 404 when no connection exists", async () => {
    const app = createApp({
      deleteTelegramToken: async () => {
        const err = new Error("No Telegram connection found");
        err.status = 404;
        throw err;
      },
    });
    const res = await invokeApp(app, {
      method: "DELETE",
      path: "/api/hades/socials/telegram/token",
    });
    assert.equal(res.status, 404);
  });

  test("POST /api/hades/socials/telegram/token still works (baseline)", async () => {
    const app = createApp();
    const res = await invokeApp(app, {
      method: "POST",
      path: "/api/hades/socials/telegram/token",
      body: { token: "123:test" },
    });
    assert.equal(res.status, 200);
  });
});
