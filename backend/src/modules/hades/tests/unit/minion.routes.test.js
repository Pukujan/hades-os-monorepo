import { test } from "node:test";
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

test("GET /api/hades/minions returns 200", async () => {
  const app = createApp();
  const response = await invokeApp(app, { method: "GET", path: "/api/hades/minions" });
  assert.equal(response.status, 200);
});

test("GET /api/hades/minions/:id returns 200", async () => {
  const app = createApp();
  const response = await invokeApp(app, { method: "GET", path: "/api/hades/minions/m1" });
  assert.equal(response.status, 200);
});

test("GET /api/hades/minions/:id/logs returns 200", async () => {
  const app = createApp();
  const response = await invokeApp(app, { method: "GET", path: "/api/hades/minions/m1/logs" });
  assert.equal(response.status, 200);
});

test("GET /api/hades/notifications returns 200", async () => {
  const app = createApp();
  const response = await invokeApp(app, { method: "GET", path: "/api/hades/notifications" });
  assert.equal(response.status, 200);
});

test("PATCH /api/hades/minions/:id returns 200", async () => {
  const app = createApp();
  const response = await invokeApp(app, {
    method: "PATCH",
    path: "/api/hades/minions/m1",
    body: { name: "Updated Minion" },
  });
  assert.equal(response.status, 200);
});

test("DELETE /api/hades/minions/:id returns 200", async () => {
  const app = createApp();
  const response = await invokeApp(app, {
    method: "DELETE",
    path: "/api/hades/minions/m1",
  });
  assert.equal(response.status, 200);
});
