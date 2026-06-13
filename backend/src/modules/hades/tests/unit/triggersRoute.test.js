import { Readable } from "node:stream";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadRoutes() {
  try {
    return await import("../../routes/hades.routes.js");
  } catch (error) {
    throw new Error(
      "Missing routes file — expected at ../../routes/hades.routes.js",
      { cause: error }
    );
  }
}

function createReq({ method, path, body, headers = {}, authContext = null }) {
  const payload = body == null ? null : Buffer.from(JSON.stringify(body));
  let pushed = false;

  const req = new Readable({
    read() {
      if (pushed) {
        this.push(null);
        return;
      }
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
  req.authContext = authContext;

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
    writeHead(status, head) {
      res.statusCode = status;
      if (head) Object.assign(headers, head);
    },
    write(chunk) { chunks.push(Buffer.from(chunk)); },
    end(chunk) {
      if (chunk) chunks.push(Buffer.from(chunk));
      if (resolve) resolve();
    },
    status(code) { res.statusCode = code; return res; },
    json(data) {
      const raw = JSON.stringify(data);
      chunks.push(Buffer.from(raw));
      headers["content-type"] = "application/json";
      if (resolve) resolve();
    },
    on() {},
    once(event, fn) { if (event === "finish" || event === "close") resolve = fn; },
    get body() { return JSON.parse(Buffer.concat(chunks).toString()); },
  };
  return res;
}

function handleRequest(router, req, res) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = () => { if (!settled) { settled = true; resolve(); } };
    const done = (err) => {
      if (err) {
        res.statusCode = err.status || 500;
        try { res.end(JSON.stringify({ error: err.message })); } catch {}
      }
      finish();
    };

    const origJson = res.json.bind(res);
    res.json = function (data) {
      origJson(data);
      finish();
      return this;
    };

    const origEnd = res.end.bind(res);
    res.end = function (chunk) {
      origEnd(chunk);
      finish();
    };

    setTimeout(() => { if (!settled) { settled = true; resolve(); } }, 500);
    router.handle(req, res, done);
  });
}

describe("Discord triggers route", () => {
  test("POST /api/hades/triggers returns 200 with execution result", async () => {
    const { createHadesRoutes } = await loadRoutes();

    const mockService = {
      async handleTrigger(body) {
        return { status: "sent", minionId: "minion_1", assignmentId: "assign_1" };
      },
    };

    const router = createHadesRoutes({ service: mockService });

    const req = createReq({
      method: "POST",
      path: "/triggers",
      body: {
        provider: "discord",
        accountId: "discord_456",
        channelId: "channel_abc",
        messageId: "msg_1",
        content: "!catgif",
        triggerType: "command",
      },
    });

    const res = createRes();
    await handleRequest(router, req, res);

    assert.equal(res.statusCode, 200, "Triggers endpoint should return 200");
    assert.equal(res.body.status, "sent");
    assert.equal(res.body.minionId, "minion_1");
  });

  test("POST /api/hades/triggers rejects unauthenticated requests", async () => {
    const { createHadesRoutes } = await loadRoutes();

    const mockService = {
      async handleTrigger(body, authContext) {
        if (!authContext) {
          const error = new Error("Unauthorized");
          error.status = 401;
          throw error;
        }
        return { status: "sent" };
      },
    };

    const router = createHadesRoutes({ service: mockService });

    const req = createReq({
      method: "POST",
      path: "/triggers",
      body: {
        provider: "discord",
        accountId: "unknown",
        channelId: "channel_abc",
        content: "!catgif",
        triggerType: "command",
      },
      authContext: null,
    });

    const res = createRes();
    await handleRequest(router, req, res);

    assert.ok(res.statusCode >= 400, "Should return error status");
    assert.equal(res.statusCode, 401, "Should return 401 for unauthenticated");
  });
});
