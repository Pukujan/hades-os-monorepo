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

test("general chat routes Telegram setup question to Socials", async () => {
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
      clientMessageId: "msg-nav-1",
      idempotencyKey: "idem-nav-1",
      message: "where do I connect telegram?",
    },
  });

  assert.equal(res.status, 200);
  const body = JSON.parse(res.body);

  assert.match(body.assistantMessage.content, /Socials/);
});

test("general chat routes forge requests", async () => {
  const mockRuntime = {
    async generateDraft() {
      return {
        source: "test",
        reply: "That belongs in Forge. Open Forge to build a minion.",
        actions: [{ label: "Open Forge", route: "/forge" }],
      };
    },
  };

  const { app } = await createApp({ overrides: { ...AUTH_OVERRIDE, runtimeService: mockRuntime } });

  const res = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/chat/general",
    headers: AUTH_HEADERS,
    body: {
      clientMessageId: "msg-nav-2",
      idempotencyKey: "idem-nav-2",
      message: "make me a discord lead minion",
    },
  });

  assert.equal(res.status, 200);
  const body = JSON.parse(res.body);

  assert.match(body.assistantMessage.content, /Forge/);
});

test("general chat returns reply content as assistant message", async () => {
  const mockRuntime = {
    async generateDraft() {
      return {
        source: "test",
        reply: "I am Hades — your workspace for managing minions.",
        actions: [],
      };
    },
  };

  const { app } = await createApp({ overrides: { ...AUTH_OVERRIDE, runtimeService: mockRuntime } });

  const res = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/chat/general",
    headers: AUTH_HEADERS,
    body: {
      clientMessageId: "msg-nav-3",
      idempotencyKey: "idem-nav-3",
      message: "what are you?",
    },
  });

  assert.equal(res.status, 200);
  const body = JSON.parse(res.body);

  assert.match(body.assistantMessage.content, /Hades/);
  assert.equal(body.assistantMessage.role, "assistant");
  assert.ok(body.conversationId);
});

test("general chat runtime receives context=general, not forge", async () => {
  const runtimeInputs = [];

  const mockRuntime = {
    async generateDraft(input) {
      runtimeInputs.push(input);
      return { source: "test", reply: "I am Hades.", actions: [] };
    },
  };

  const { app } = await createApp({ overrides: { ...AUTH_OVERRIDE, runtimeService: mockRuntime } });

  await invokeApp(app, {
    method: "POST", path: "/api/hades/chat/general", headers: AUTH_HEADERS,
    body: { clientMessageId: "msg-ctx-1", idempotencyKey: "idem-ctx-1", message: "hello" },
  });

  assert.equal(runtimeInputs.length, 1);
  assert.equal(runtimeInputs[0].context, "general");
  assert.notEqual(runtimeInputs[0].context, "forge");
});
