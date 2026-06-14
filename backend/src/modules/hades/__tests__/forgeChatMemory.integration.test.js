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

test("forge chat passes previous forge messages into the runtime", async () => {
  const runtimeInputs = [];

  const mockRuntime = {
    async generateDraft(input) {
      runtimeInputs.push(input);
      return {
        source: "test",
        assistantText: "Ok, working on it.",
        draftPatch: {},
        missingFields: [],
        suggestions: [],
        sessionId: "sess-" + runtimeInputs.length,
      };
    },
  };

  const { app } = await createApp({ overrides: { ...AUTH_OVERRIDE, runtimeService: mockRuntime } });

  const res1 = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/chat/forge",
    headers: AUTH_HEADERS,
    body: {
      clientMessageId: "msg-fm-1",
      idempotencyKey: "idem-fm-1",
      message: "make a telegram minion",
    },
  });

  const body1 = JSON.parse(res1.body);
  const convId = body1.conversationId;

  const res2 = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/chat/forge",
    headers: AUTH_HEADERS,
    body: {
      clientMessageId: "msg-fm-2",
      idempotencyKey: "idem-fm-2",
      message: "make it approval required",
      conversationId: convId,
    },
  });

  assert.equal(res1.status, 200);
  assert.equal(res2.status, 200);

  assert.equal(runtimeInputs.length, 2);
  const secondInput = runtimeInputs[1];
  assert.equal(secondInput.context, "forge");
});

test("forge chat does not receive general chat messages as context", async () => {
  const runtimeInputs = [];

  const mockRuntime = {
    async generateDraft(input) {
      runtimeInputs.push(input);
      return {
        source: "test",
        assistantText: "ok",
        draftPatch: {},
        missingFields: [],
        suggestions: [],
        sessionId: "sess-" + runtimeInputs.length,
      };
    },
  };

  const { app } = await createApp({ overrides: { ...AUTH_OVERRIDE, runtimeService: mockRuntime } });

  await invokeApp(app, {
    method: "POST",
    path: "/api/hades/chat/general",
    headers: AUTH_HEADERS,
    body: {
      clientMessageId: "msg-fm-3",
      idempotencyKey: "idem-fm-3",
      message: "where is telegram setup?",
    },
  });

  await invokeApp(app, {
    method: "POST",
    path: "/api/hades/chat/forge",
    headers: AUTH_HEADERS,
    body: {
      clientMessageId: "msg-fm-4",
      idempotencyKey: "idem-fm-4",
      message: "make a telegram minion",
    },
  });

  const forgeInputs = runtimeInputs.filter((i) => i.context === "forge");
  assert.equal(forgeInputs.length, 1);

  const generalInputs = runtimeInputs.filter((i) => i.context === "general");
  assert.equal(generalInputs.length, 1);
});

test("general chat passes prior general messages into the runtime", async () => {
  const runtimeInputs = [];

  const mockRuntime = {
    async generateDraft(input) {
      runtimeInputs.push(input);
      return { source: "test", reply: "ok", actions: [], sessionId: "sess-" + runtimeInputs.length };
    },
  };

  const { app } = await createApp({ overrides: { ...AUTH_OVERRIDE, runtimeService: mockRuntime } });

  const res1 = await invokeApp(app, {
    method: "POST", path: "/api/hades/chat/general", headers: AUTH_HEADERS,
    body: { clientMessageId: "msg-gm-1", idempotencyKey: "idem-gm-1", message: "my name is Hermes" },
  });

  const body1 = JSON.parse(res1.body);
  const convId = body1.conversationId;

  const res2 = await invokeApp(app, {
    method: "POST", path: "/api/hades/chat/general", headers: AUTH_HEADERS,
    body: { clientMessageId: "msg-gm-2", idempotencyKey: "idem-gm-2", message: "what is my name?", conversationId: convId },
  });

  assert.equal(res1.status, 200);
  assert.equal(res2.status, 200);

  assert.equal(runtimeInputs.length, 2);
  const secondInput = runtimeInputs[1];
  assert.equal(secondInput.context, "general");
});

test("general chat does not receive forge messages as context", async () => {
  const runtimeInputs = [];

  const mockRuntime = {
    async generateDraft(input) {
      runtimeInputs.push(input);
      return { source: "test", reply: "ok", actions: [] };
    },
  };

  const { app } = await createApp({ overrides: { ...AUTH_OVERRIDE, runtimeService: mockRuntime } });

  await invokeApp(app, {
    method: "POST", path: "/api/hades/chat/forge", headers: AUTH_HEADERS,
    body: { clientMessageId: "msg-cx-1", idempotencyKey: "idem-cx-1", message: "make a telegram minion" },
  });

  await invokeApp(app, {
    method: "POST", path: "/api/hades/chat/general", headers: AUTH_HEADERS,
    body: { clientMessageId: "msg-cx-2", idempotencyKey: "idem-cx-2", message: "what did I just say?" },
  });

  const generalInputs = runtimeInputs.filter((i) => i.context === "general");
  assert.equal(generalInputs.length, 1);
  const forgeInputs = runtimeInputs.filter((i) => i.context === "forge");
  assert.equal(forgeInputs.length, 1);
});
