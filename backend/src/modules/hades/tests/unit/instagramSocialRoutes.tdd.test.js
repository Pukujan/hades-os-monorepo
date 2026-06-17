import { describe, test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createHadesRoutes } from "../../routes/hades.routes.js";
import { invokeApp } from "../../../../shared/testing/invoke-app.js";

const AUTH_CONTEXT = {
  userId: "user_123",
  tenantId: "tenant_123",
};

function createApp(overrides = {}) {
  const calls = [];
  const service = {
    readiness: async () => ({ status: "ok" }),
    bootstrap: async () => ({}),
    chat: async () => ({}),
    testMinion: async () => ({}),
    saveMinion: async () => ({}),
    assignMinion: async () => ({}),
    handleTrigger: async () => ({}),
    getConversationMessages: async () => [],
    clearMessages: async () => ({ cleared: true }),
    listSocialConnections: async () => [],
    saveTelegramToken: async () => ({}),
    saveDiscordToken: async () => ({}),
    saveGitHubToken: async () => ({}),
    deleteTelegramToken: async () => ({ deleted: true }),
    listMinions: async () => [],
    getMinion: async () => null,
    getMinionLogs: async () => [],
    listNotifications: async () => [],
    updateMinion: async () => null,
    deleteMinion: async () => null,
    createInstagramAuthLink: async (body, authContext) => {
      calls.push({ method: "createInstagramAuthLink", body, authContext });
      return {
        provider: "instagram",
        authUrl: "https://connect.composio.dev/connect/instagram/user_123",
        connectionIntentId: "ig-intent-1",
      };
    },
    saveInstagramConnection: async (body, authContext) => {
      calls.push({ method: "saveInstagramConnection", body, authContext });
      return {
        provider: "instagram",
        status: "connected",
        handle: "hades_test",
        connector: body.connector || "composio",
      };
    },
    deleteInstagramConnection: async (authContext) => {
      calls.push({ method: "deleteInstagramConnection", authContext });
      return { deleted: true, provider: "instagram" };
    },
    handleInstagramWebhook: async (body, headers) => {
      calls.push({ method: "handleInstagramWebhook", body, headers });
      return { status: "queued" };
    },
    ...overrides,
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authContext = AUTH_CONTEXT;
    next();
  });
  app.use("/api/hades", createHadesRoutes({ service }));
  return { app, calls };
}

describe("Instagram social connector routes", () => {
  test("POST /api/hades/socials/instagram/connect creates a per-user OAuth/MCP auth link", async () => {
    const { app, calls } = createApp();

    const response = await invokeApp(app, {
      method: "POST",
      path: "/api/hades/socials/instagram/connect",
      body: {
        connector: "composio",
        requestedScopes: ["instagram.dm.read", "instagram.dm.send"],
        userId: "malicious_user_override",
      },
    });

    assert.equal(response.status, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.provider, "instagram");
    assert.match(body.authUrl, /^https:\/\//);
    assert.equal(calls[0].method, "createInstagramAuthLink");
    assert.deepEqual(calls[0].authContext, AUTH_CONTEXT);
    assert.equal(calls[0].body.userId, "malicious_user_override");
  });

  test("POST /api/hades/socials/instagram/connection stores only the authenticated user's connection", async () => {
    const { app, calls } = createApp();

    const response = await invokeApp(app, {
      method: "POST",
      path: "/api/hades/socials/instagram/connection",
      body: {
        connector: "composio",
        externalConnectionId: "composio-conn-1",
        instagramBusinessAccountId: "17841400000000000",
        handle: "hades_test",
        userId: "other_user",
        tenantId: "other_tenant",
      },
    });

    assert.equal(response.status, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.provider, "instagram");
    assert.equal(body.status, "connected");
    assert.equal(calls[0].method, "saveInstagramConnection");
    assert.deepEqual(calls[0].authContext, AUTH_CONTEXT);
  });

  test("DELETE /api/hades/socials/instagram/connection disconnects by auth context only", async () => {
    const { app, calls } = createApp();

    const response = await invokeApp(app, {
      method: "DELETE",
      path: "/api/hades/socials/instagram/connection",
    });

    assert.equal(response.status, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.deleted, true);
    assert.equal(calls[0].method, "deleteInstagramConnection");
    assert.deepEqual(calls[0].authContext, AUTH_CONTEXT);
  });

  test("POST /api/hades/triggers/instagram accepts signed Instagram events for runtime processing", async () => {
    const { app, calls } = createApp();

    const response = await invokeApp(app, {
      method: "POST",
      path: "/api/hades/triggers/instagram",
      headers: {
        "x-hades-instagram-signature": "test-signature",
      },
      body: {
        connector: "composio",
        eventType: "instagram.dm.message_received",
        externalConnectionId: "composio-conn-1",
        conversationId: "ig-conv-1",
        message: {
          id: "ig-msg-1",
          text: "hello",
          senderId: "ig-user-1",
        },
      },
    });

    assert.equal(response.status, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.status, "queued");
    assert.equal(calls[0].method, "handleInstagramWebhook");
    assert.equal(calls[0].body.eventType, "instagram.dm.message_received");
  });
});
