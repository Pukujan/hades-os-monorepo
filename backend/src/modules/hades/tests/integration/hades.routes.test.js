import { Readable } from "node:stream";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../../../../core/app.js";

function createReq({ method, path, body, headers = {} }) {
  const payload = body == null ? null : Buffer.from(JSON.stringify(body));
  let pushed = false;

  const req = new Readable({
    read() {
      if (pushed) {
        this.push(null);
        return;
      }
      pushed = true;
      if (payload) {
        this.push(payload);
      }
      this.push(null);
    }
  });

  req.method = method;
  req.url = path;
  req.headers = {
    host: "127.0.0.1",
    ...(payload ? { "content-type": "application/json", "content-length": String(payload.length) } : {}),
    ...headers
  };

  return req;
}

function createRes() {
  const chunks = [];
  const headers = {};
  let resolve;

  const res = {
    statusCode: 200,
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    getHeader(name) {
      return headers[name.toLowerCase()];
    },
    removeHeader(name) {
      delete headers[name.toLowerCase()];
    },
    writeHead(statusCode, nextHeaders = {}) {
      res.statusCode = statusCode;
      for (const [name, value] of Object.entries(nextHeaders)) {
        res.setHeader(name, value);
      }
      return res;
    },
    status(statusCode) {
      res.statusCode = statusCode;
      return res;
    },
    json(value) {
      if (!res.getHeader("content-type")) {
        res.setHeader("content-type", "application/json; charset=utf-8");
      }
      res.end(JSON.stringify(value));
      return res;
    },
    send(value) {
      if (typeof value === "object" && !Buffer.isBuffer(value)) {
        return res.json(value);
      }
      res.end(value);
      return res;
    },
    end(value) {
      if (value != null) {
        chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(String(value)));
      }
      const body = Buffer.concat(chunks).toString("utf8");
      resolve({
        status: res.statusCode,
        headers: { ...headers },
        body
      });
      return res;
    }
  };

  const promise = new Promise((done) => {
    resolve = done;
  });

  return { res, promise };
}

async function invoke(app, { method, path, body, headers = {} }) {
  const req = createReq({ method, path, body, headers });
  const { res, promise } = createRes();
  app.handle(req, res);
  return promise;
}

test("GET /api/health returns ok", async () => {
  const { app } = await createApp();
  const response = await invoke(app, { method: "GET", path: "/api/health" });
  assert.equal(response.status, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.status, "ok");
});

test("POST /api/hades/chat returns draft and Hermes runtime source", async () => {
  const hadBase = Object.hasOwn(process.env, "OPENROUTER_BASE_URL");
  const hadKey = Object.hasOwn(process.env, "OPENROUTER_API_KEY");
  const prevBase = process.env.OPENROUTER_BASE_URL;
  const prevKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_BASE_URL;
  delete process.env.OPENROUTER_API_KEY;

  try {
    const { app } = await createApp();
    const response = await invoke(app, {
      method: "POST",
      path: "/api/hades/chat",
      body: {
        clientMessageId: "msg-1",
        idempotencyKey: "idem-chat-1",
        message: "I want a command to send cat memes in Discord",
        currentDraft: {
          name: null,
          description: null,
          category: null,
          targetSocial: null,
          triggerType: null,
          commandName: null,
          action: null,
          responseStyle: "helpful",
          safetyMode: "ask_first",
          testInput: null,
          status: "incomplete"
        }
      }
    });

    assert.equal(response.status, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.source, "hermes_runtime");
    assert.ok(body.conversationId);
    assert.equal(body.userMessage.role, "user");
    assert.equal(body.assistantMessage.role, "assistant");
    assert.ok(body.draft.name);
  } finally {
    if (hadBase) process.env.OPENROUTER_BASE_URL = prevBase;
    else delete process.env.OPENROUTER_BASE_URL;
    if (hadKey) process.env.OPENROUTER_API_KEY = prevKey;
    else delete process.env.OPENROUTER_API_KEY;
  }
});

test("POST /api/hades/chat is idempotent for repeated keys", async () => {
  const { app } = await createApp();
  const payload = {
    clientMessageId: "msg-1",
    idempotencyKey: "idem-chat-2",
    message: "I want a command to send cat memes in Discord",
    currentDraft: {
      name: null,
      description: null,
      category: null,
      targetSocial: null,
      triggerType: null,
      commandName: null,
      action: null,
      responseStyle: "helpful",
      safetyMode: "ask_first",
      testInput: null,
      status: "incomplete"
    }
  };

  const first = await invoke(app, { method: "POST", path: "/api/hades/chat", body: payload });
  const second = await invoke(app, { method: "POST", path: "/api/hades/chat", body: payload });
  const firstBody = JSON.parse(first.body);
  const secondBody = JSON.parse(second.body);

  assert.equal(firstBody.userMessage.id, secondBody.userMessage.id);
  assert.equal(firstBody.assistantMessage.id, secondBody.assistantMessage.id);
});

test("POST /api/hades/chat can use Hermes runtime without leaking server secrets", async () => {
  const previous = {
    HERMES_RUNTIME_ENABLED: process.env.HERMES_RUNTIME_ENABLED,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  process.env.HERMES_RUNTIME_ENABLED = "true";
  delete process.env.OPENROUTER_API_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only-supabase-secret";

  try {
    const { app } = await createApp();
    const response = await invoke(app, {
      method: "POST",
      path: "/api/hades/chat",
      body: {
        clientMessageId: "msg-runtime-1",
        idempotencyKey: "idem-runtime-chat-1",
        message: "Make a Discord command called !sendcat that sends random cat meme gifs",
        currentDraft: {
          name: null,
          description: null,
          category: null,
          targetSocial: null,
          triggerType: null,
          commandName: null,
          action: null,
          responseStyle: "helpful",
          safetyMode: "ask_first",
          testInput: null,
          status: "incomplete"
        }
      }
    });

    assert.equal(response.status, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.source, "hermes_runtime");
    assert.ok(body.conversationId);
    assert.equal(body.userMessage.role, "user");
    assert.equal(body.assistantMessage.role, "assistant");
    assert.ok(body.draft.name);
    assert.equal(response.body.includes("server-only-supabase-secret"), false);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("write routes validate and persist", async () => {
  const { app } = await createApp();
  const testDraft = {
    name: "Task Helper",
    description: "Turns messy notes into clean task cards.",
    category: "task",
    targetSocial: "private",
    triggerType: "manual",
    commandName: null,
    action: "turn messy instructions into simple task cards",
    responseStyle: "helpful",
    safetyMode: "ask_first",
    testInput: null,
    status: "ready_to_test"
  };

  const bad = await invoke(app, {
    method: "POST",
    path: "/api/hades/minions/test",
    body: { draft: { ...testDraft, action: null }, idempotencyKey: "bad" }
  });
  assert.equal(bad.status, 400);

  const testRes = await invoke(app, {
    method: "POST",
    path: "/api/hades/minions/test",
    body: { draft: testDraft, idempotencyKey: "test-1" }
  });
  assert.equal(testRes.status, 201);
  const testBody = JSON.parse(testRes.body);
  assert.equal(testBody.testRun.status, "passed");
  assert.equal(testBody.draft.status, "tested");

  const saveRes = await invoke(app, {
    method: "POST",
    path: "/api/hades/minions",
    body: { draft: testBody.draft, idempotencyKey: "save-1" }
  });
  assert.equal(saveRes.status, 201);
  const saveBody = JSON.parse(saveRes.body);
  assert.equal(saveBody.minion.status, "active");

  const assignmentRes = await invoke(app, {
    method: "POST",
    path: "/api/hades/assignments",
    body: {
      minionId: saveBody.minion.id,
      socialLinkId: "discord",
      commandName: "!sendcat",
      idempotencyKey: "assign-1"
    }
  });
  assert.equal(assignmentRes.status, 201);
  const assignmentBody = JSON.parse(assignmentRes.body);
  assert.equal(assignmentBody.assignment.socialLinkId, "discord");
});
