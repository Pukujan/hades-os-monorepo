import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../../../core/app.js";
import { invokeApp } from "../../../shared/testing/invoke-app.js";

const AUTH_OVERRIDE = {
  auth: {
    requireHadesAuth: async () => ({
      userId: "user_a",
      tenantId: "tenant_a",
      sessionToken: "test-token",
    }),
  },
};

const AUTH_HEADERS = { authorization: "Bearer test-token" };

test("general and forge conversations are stored separately", async () => {
  const messages = { general: [], forge: [] };

  const mockRuntime = {
    async generateDraft({ context, message }) {
      if (context === "forge") {
        return {
          source: "test",
          assistantText: "Forge reply to: " + message,
          draftPatch: {},
          missingFields: [],
          suggestions: [],
          sessionId: "forge-sess",
        };
      }
      return {
        source: "test",
        reply: "General reply to: " + message,
        actions: [],
        sessionId: "gen-sess",
      };
    },
  };

  const { app } = await createApp({ overrides: { ...AUTH_OVERRIDE, runtimeService: mockRuntime } });

  const genRes = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/chat/general",
    headers: AUTH_HEADERS,
    body: {
      clientMessageId: "msg-gen-1",
      idempotencyKey: "idem-gen-1",
      message: "where do I connect telegram?",
    },
  });

  const forgeRes = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/chat/forge",
    headers: AUTH_HEADERS,
    body: {
      clientMessageId: "msg-forge-1",
      idempotencyKey: "idem-forge-1",
      message: "make a telegram minion",
    },
  });

  assert.equal(genRes.status, 200);
  assert.equal(forgeRes.status, 200);

  const genBody = JSON.parse(genRes.body);
  const forgeBody = JSON.parse(forgeRes.body);

  assert.match(genBody.assistantMessage.content, /General reply/);
  assert.match(forgeBody.assistantMessage.content, /Forge reply/);

  assert.notEqual(genBody.conversationId, forgeBody.conversationId);
});

test("general chat returns structured response with content", async () => {
  const mockRuntime = {
    async generateDraft() {
      return {
        source: "test",
        reply: "Go to Socials to connect Telegram.",
        actions: [{ label: "Open Socials", route: "/app/socials" }],
      };
    },
  };

  const { app } = await createApp({ overrides: { ...AUTH_OVERRIDE, runtimeService: mockRuntime } });

  const res = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/chat/general",
    headers: AUTH_HEADERS,
    body: {
      clientMessageId: "msg-gen-nav-1",
      idempotencyKey: "idem-gen-nav-1",
      message: "where do I connect telegram?",
    },
  });

  assert.equal(res.status, 200);
  const body = JSON.parse(res.body);

  assert.match(body.assistantMessage.content, /Socials/);
  assert.equal(body.assistantMessage.role, "assistant");
  assert.equal(body.source, "test");
});

test("forge chat returns structure with draft", async () => {
  const mockRuntime = {
    async generateDraft() {
      return {
        source: "test",
        assistantText: "Creating a Telegram minion.",
        draftPatch: { name: "Telegram Minion", category: "task", triggerType: "command", targetSocial: "telegram", action: "handle Telegram messages" },
        missingFields: [],
        suggestions: [],
        sessionId: "forge-sess-1",
      };
    },
  };

  const { app } = await createApp({ overrides: { ...AUTH_OVERRIDE, runtimeService: mockRuntime } });

  const res = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/chat/forge",
    headers: AUTH_HEADERS,
    body: {
      clientMessageId: "msg-forge-nav-1",
      idempotencyKey: "idem-forge-nav-1",
      message: "make a telegram minion",
    },
  });

  assert.equal(res.status, 200);
  const body = JSON.parse(res.body);

  assert.equal(body.source, "test");
  assert.equal(body.draft.name, "Telegram Minion");
  assert.equal(body.assistantMessage.content, "Creating a Telegram minion.");
});
