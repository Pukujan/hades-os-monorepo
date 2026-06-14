import { Readable } from "node:stream";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../../../core/app.js";

const AUTH_OVERRIDE = {
  auth: {
    requireHadesAuth: async () => ({
      userId: "test-user",
      tenantId: "tenant_test-user",
      sessionToken: "test-token",
    }),
  },
};

const AUTH_HEADERS = { authorization: "Bearer test-token" };

const MOCK_RUNTIME = {
  generateDraft: async () => ({
    source: "hermes_runtime",
    assistantText: "Hello, mortal. What brings you to the underworld?",
    reply: "Hello, mortal. What brings you to the underworld?",
    draftPatch: {},
    missingFields: [],
    suggestions: [],
    sessionId: null,
    actions: [],
    cards: [],
  }),
};

function createReq(overrides) {
  const { method = "POST", path, body, headers = {} } = overrides;
  const payload = body == null ? null : Buffer.from(JSON.stringify(body));
  let pushed = false;
  const req = new Readable({
    read() {
      if (pushed) { this.push(null); return; }
      pushed = true;
      if (payload) this.push(payload);
      this.push(null);
    },
  });
  req.method = method;
  req.url = path;
  req.headers = {
    host: "127.0.0.1",
    ...(payload ? { "content-type": "application/json", "content-length": String(payload.length) } : {}),
    ...headers,
  };
  return req;
}

function createRes() {
  const chunks = [];
  const headers = {};
  let resolve;
  const res = {
    statusCode: 200,
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    getHeader(name) { return headers[name.toLowerCase()]; },
    removeHeader(name) { delete headers[name.toLowerCase()]; },
    writeHead(statusCode, nextHeaders = {}) {
      res.statusCode = statusCode;
      for (const [n, v] of Object.entries(nextHeaders)) res.setHeader(n, v);
      return res;
    },
    status(code) { res.statusCode = code; return res; },
    json(value) {
      if (!res.getHeader("content-type")) res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify(value));
      return res;
    },
    send(value) {
      if (typeof value === "object" && !Buffer.isBuffer(value)) return res.json(value);
      res.end(value);
      return res;
    },
    end(value) {
      if (value != null) chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(String(value)));
      resolve({ status: res.statusCode, headers: { ...headers }, body: Buffer.concat(chunks).toString("utf8") });
      return res;
    },
  };
  const promise = new Promise((done) => { resolve = done; });
  return { res, promise };
}

async function invoke(app, { method = "POST", path, body, headers = {} }) {
  const req = createReq({ method, path, body, headers });
  const { res, promise } = createRes();
  app.handle(req, res);
  return promise;
}

// ---- Test A4 ----
test("chat route surfaces insert error instead of silently succeeding", async () => {
  const failClient = {
    tables: {},
    table() {
      return {
        upsert: async () => { throw new Error("Supabase insert failed: connection refused"); },
        insert: async () => { throw new Error("Supabase insert failed: connection refused"); },
      };
    },
  };

  const { app } = await createApp({
    overrides: {
      ...AUTH_OVERRIDE,
      runtimeService: MOCK_RUNTIME,
      supabaseClient: failClient,
    },
  });

  const response = await invoke(app, {
    method: "POST",
    path: "/api/hades/chat/general",
    headers: AUTH_HEADERS,
    body: {
      clientMessageId: "msg-persist-1",
      idempotencyKey: "idem-persist-1",
      message: "Hello",
      currentDraft: { name: null, description: null, category: null, targetSocial: null, triggerType: null, commandName: null, action: null, responseStyle: "helpful", safetyMode: "ask_first", testInput: null, status: "incomplete" },
    },
  });

  const isError = response.status >= 400 || response.status === 500;
  assert.ok(isError, `Expected error status but got ${response.status}: ${response.body}`);
});

// ---- Test A1 ----
test("POST /chat/general persists conversation and user + assistant messages via client", async () => {
  const inserts = [];
  const trackingClient = {
    tables: {},
    table(name) {
      return {
        upsert: async (row) => { inserts.push({ table: name, mode: "upsert", row: { ...row } }); },
        insert: async (row) => { inserts.push({ table: name, mode: "insert", row: { ...row } }); },
      };
    },
  };

  const { app } = await createApp({
    overrides: {
      ...AUTH_OVERRIDE,
      runtimeService: MOCK_RUNTIME,
      supabaseClient: trackingClient,
    },
  });

  const response = await invoke(app, {
    method: "POST",
    path: "/api/hades/chat/general",
    headers: AUTH_HEADERS,
    body: {
      clientMessageId: "msg-persist-2",
      idempotencyKey: "idem-persist-2",
      message: "hello",
      currentDraft: { name: null, description: null, category: null, targetSocial: null, triggerType: null, commandName: null, action: null, responseStyle: "helpful", safetyMode: "ask_first", testInput: null, status: "incomplete" },
    },
  });

  const body = JSON.parse(response.body);
  assert.equal(response.status, 200, `Expected 200 but got ${response.status}: ${response.body}`);

  // Verify the response shape
  assert.ok(body.conversationId, "response must include conversationId");
  assert.equal(body.userMessage.role, "user");
  assert.equal(body.assistantMessage.role, "assistant");

  // Verify inserts were called on the client
  const convInserts = inserts.filter((i) => i.table === "hades_conversations");
  const msgInserts = inserts.filter((i) => i.table === "hades_messages");
  assert.ok(convInserts.length >= 1, `Expected at least 1 conversation insert, got ${convInserts.length}`);
  assert.ok(msgInserts.length >= 2, `Expected at least 2 message inserts (user+assistant), got ${msgInserts.length}`);

  // Verify conversation context_type
  const convRow = convInserts[0].row;
  assert.equal(convRow.context_type, "general");
});

// ---- Test A2 ----
test("POST /chat/forge persists forge conversation separately", async () => {
  const inserts = [];
  const trackingClient = {
    tables: {},
    table(name) {
      return {
        upsert: async (row) => { inserts.push({ table: name, mode: "upsert", row: { ...row } }); },
        insert: async (row) => { inserts.push({ table: name, mode: "insert", row: { ...row } }); },
      };
    },
  };

  const { app } = await createApp({
    overrides: {
      ...AUTH_OVERRIDE,
      runtimeService: MOCK_RUNTIME,
      supabaseClient: trackingClient,
    },
  });

  const response = await invoke(app, {
    method: "POST",
    path: "/api/hades/chat/forge",
    headers: AUTH_HEADERS,
    body: {
      clientMessageId: "msg-persist-3",
      idempotencyKey: "idem-persist-3",
      message: "make a cat minion",
      currentDraft: { name: null, description: null, category: null, targetSocial: null, triggerType: null, commandName: null, action: null, responseStyle: "helpful", safetyMode: "ask_first", testInput: null, status: "incomplete" },
    },
  });

  assert.equal(response.status, 200, `Expected 200 but got ${response.status}: ${response.body}`);

  const convInserts = inserts.filter((i) => i.table === "hades_conversations");
  const msgInserts = inserts.filter((i) => i.table === "hades_messages");
  assert.ok(convInserts.length >= 1, `Expected at least 1 conversation insert, got ${convInserts.length}`);
  assert.ok(msgInserts.length >= 2, `Expected at least 2 message inserts, got ${msgInserts.length}`);

  const convRow = convInserts[0].row;
  assert.equal(convRow.context_type, "forge");

  const userMsgs = msgInserts.filter((m) => m.row.role === "user");
  assert.ok(userMsgs.some((m) => m.row.content && m.row.content.includes("make a cat minion")));
});

// ---- Test A3 ----
test("POST /chat/general without auth header returns 401 and does not persist", async () => {
  let insertCalled = false;
  const guardClient = {
    tables: {},
    table(name) {
      return {
        upsert: async () => { insertCalled = true; },
        insert: async () => { insertCalled = true; },
      };
    },
  };

  const { app } = await createApp({
    overrides: {
      runtimeService: MOCK_RUNTIME,
      supabaseClient: guardClient,
    },
  });

  const response = await invoke(app, {
    method: "POST",
    path: "/api/hades/chat/general",
    headers: {},
    body: {
      clientMessageId: "msg-unauth-1",
      idempotencyKey: "idem-unauth-1",
      message: "hello",
      currentDraft: { name: null, description: null, category: null, targetSocial: null, triggerType: null, commandName: null, action: null, responseStyle: "helpful", safetyMode: "ask_first", testInput: null, status: "incomplete" },
    },
  });

  assert.equal(response.status, 401, `Expected 401 but got ${response.status}: ${response.body}`);
  assert.equal(insertCalled, false, "No inserts should occur for unauthenticated requests");
});

// ---- Test B1 ----
test("chat/general loads recent messages before calling Hermes", async () => {
  let runtimeMessages = null;

  const trackingRuntime = {
    generateDraft: async (params) => {
      runtimeMessages = params.messages;
      return {
        source: "hermes_runtime",
        reply: "I see your previous messages. How can I help?",
        assistantText: "I see your previous messages. How can I help?",
        draftPatch: {},
        missingFields: [],
        suggestions: [],
        sessionId: null,
        actions: [],
        cards: [],
      };
    },
  };

  const trackingClient = {
    tables: {},
    table(name) {
      return {
        upsert: async () => {},
        insert: async () => {},
      };
    },
  };

  const { app } = await createApp({
    overrides: {
      ...AUTH_OVERRIDE,
      runtimeService: trackingRuntime,
      supabaseClient: trackingClient,
    },
  });

  // Send first message
  await invoke(app, {
    method: "POST", path: "/api/hades/chat/general", headers: AUTH_HEADERS,
    body: { clientMessageId: "msg-ctx-1", idempotencyKey: "idem-ctx-1", message: "first message", currentDraft: { name: null, description: null, category: null, targetSocial: null, triggerType: null, commandName: null, action: null, responseStyle: "helpful", safetyMode: "ask_first", testInput: null, status: "incomplete" } },
  });

  // Send second message — the runtime should receive the first message in context
  runtimeMessages = null;
  await invoke(app, {
    method: "POST", path: "/api/hades/chat/general", headers: AUTH_HEADERS,
    body: { clientMessageId: "msg-ctx-2", idempotencyKey: "idem-ctx-2", message: "second message", currentDraft: { name: null, description: null, category: null, targetSocial: null, triggerType: null, commandName: null, action: null, responseStyle: "helpful", safetyMode: "ask_first", testInput: null, status: "incomplete" } },
  });

  assert.ok(runtimeMessages !== null, "Runtime should have been called with messages");
  assert.ok(Array.isArray(runtimeMessages), "Runtime should receive messages array");
  assert.ok(runtimeMessages.length >= 2, `Expected at least 2 messages (user+assistant from first exchange), got ${runtimeMessages.length}`);

  const userMsgs = runtimeMessages.filter((m) => m.role === "user");
  assert.ok(userMsgs.some((m) => m.content === "first message"), "Runtime should receive previous user message");
});
