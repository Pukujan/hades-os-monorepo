import { Readable } from "node:stream";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../../../core/app.js";
import { sanitizeAssistantText } from "../parser.js";
import { buildGeneralChatPrompt } from "../prompts/generalChatPrompt.js";
import { buildForgeChatPrompt } from "../prompts/forgeChatPrompt.js";

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

const DEFAULT_DRAFT = { name: null, description: null, category: null, targetSocial: null, triggerType: null, commandName: null, action: null, responseStyle: "helpful", safetyMode: "ask_first", testInput: null, status: "incomplete" };

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

// ---- Test C1 ----
test("sanitizeAssistantText removes <pastor> wrapper tag from assistant text", () => {
  const input = "<pastor>You're sitting in the underworld lobby. What do you need?</pastor>";
  const output = sanitizeAssistantText(input);
  assert.equal(output.includes("<pastor>"), false);
  assert.equal(output.includes("</pastor>"), false);
  assert.match(output, /underworld lobby/);
});

// ---- Test C2 ----
test("sanitizeAssistantText removes known role wrapper tags", () => {
  const cases = [
    ["<hades>Hello</hades>", "Hello"],
    ["<persona>Hello</persona>", "Hello"],
    ["<reply>Hello</reply>", "Hello"],
    ["<message>Hello</message>", "Hello"],
    ["<assistant>Hello</assistant>", "Hello"],
    ["<narrator>Hello</narrator>", "Hello"],
    ["<final>Hello</final>", "Hello"],
  ];
  for (const [input, expected] of cases) {
    assert.equal(sanitizeAssistantText(input), expected);
  }
});

// ---- Test C3 ----
test("sanitizeAssistantText does not render raw HTML tags as trusted styling", () => {
  const input = "<div>Hello</div>";
  const output = sanitizeAssistantText(input);
  assert.equal(output.includes("<div>"), false);
  assert.equal(output.includes("</div>"), false);
  assert.equal(output, "Hello");
});

// ---- Test C4 ----
test("sanitizeAssistantText leaves normal text unchanged", () => {
  const input = "You're in Hades. Quiet, orderly, running.";
  assert.equal(sanitizeAssistantText(input), input);
});

// ---- Test C5 ----
test("sanitizeAssistantText allows markdown bold and italic", () => {
  const bold = "**Careful.** The little gods are restless.";
  assert.equal(sanitizeAssistantText(bold), bold);
  const italic = "*The forge is listening.*";
  assert.equal(sanitizeAssistantText(italic), italic);
});

// ---- Test C1 (route-level) ----
test("POST /chat/general returns sanitized reply without <pastor> wrapper tag", async () => {
  const leakRuntime = {
    generateDraft: async () => ({
      source: "hermes_runtime",
      reply: "<pastor>You're sitting in the underworld lobby. What do you need?</pastor>",
      assistantText: "",
      draftPatch: {},
      missingFields: [],
      suggestions: [],
      sessionId: null,
      actions: [],
      cards: [],
    }),
  };

  const { app } = await createApp({
    overrides: {
      ...AUTH_OVERRIDE,
      runtimeService: leakRuntime,
    },
  });

  const response = await invoke(app, {
    method: "POST",
    path: "/api/hades/chat/general",
    headers: AUTH_HEADERS,
    body: { clientMessageId: "msg-tag-1", idempotencyKey: "idem-tag-1", message: "hello", currentDraft: DEFAULT_DRAFT },
  });

  assert.equal(response.status, 200);
  const body = JSON.parse(response.body);
  const reply = body.assistantMessage.content;

  assert.equal(reply.includes("<pastor>"), false, `Reply should not contain <pastor> tag. Got: ${reply}`);
  assert.equal(reply.includes("</pastor>"), false, `Reply should not contain </pastor> tag. Got: ${reply}`);
  assert.match(reply, /underworld lobby/, `Reply should preserve inner text. Got: ${reply}`);
});

// ---- Test D1 ----
test("general chat prompt forbids XML and HTML wrapper tags in output contract", () => {
  const prompt = buildGeneralChatPrompt({ routes: [] });
  const hasOutputContract =
    prompt.includes("Final user-visible reply") ||
    prompt.includes("wrapper tags") ||
    prompt.includes("XML") ||
    prompt.includes("HTML tags") ||
    prompt.includes("<pastor>") ||
    prompt.includes("disallowed");
  assert.ok(hasOutputContract, "General chat prompt must contain output contract language forbidding wrapper tags");
});

test("forge chat prompt forbids XML and HTML wrapper tags in output contract", () => {
  const prompt = buildForgeChatPrompt();
  const hasOutputContract =
    prompt.includes("Final user-visible reply") ||
    prompt.includes("wrapper tags") ||
    prompt.includes("XML") ||
    prompt.includes("HTML tags") ||
    prompt.includes("disallowed");
  assert.ok(hasOutputContract, "Forge chat prompt must contain output contract language forbidding wrapper tags");
});
