import { test, describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Group E — CORS
 *
 * Rules:
 * 1. CORS middleware must read CORS_ORIGIN env var as whitelist
 * 2. Requests from allowed origins get their origin echoed back
 * 3. Requests from disallowed origins get the first allowed origin
 */

async function loadCors() {
  return import("../../services/cors.js");
}

describe("createCorsMiddleware", () => {
  test("allows origin matching CORS_ORIGIN exactly", async () => {
    const { createCorsMiddleware } = await loadCors();
    const corsMw = createCorsMiddleware("https://app.example.com");

    let setOrigin = null;
    const req = { headers: { origin: "https://app.example.com" } };
    const res = {
      setHeader(name, value) { if (name === "Access-Control-Allow-Origin") setOrigin = value; },
      writeHead() {},
      end() {},
    };
    let calledNext = false;
    corsMw(req, res, () => { calledNext = true; });

    assert.equal(setOrigin, "https://app.example.com");
    assert.equal(calledNext, true);
  });

  test("rejects origin not in CORS_ORIGIN list", async () => {
    const { createCorsMiddleware } = await loadCors();
    const corsMw = createCorsMiddleware("https://app.example.com");

    let setOrigin = null;
    const req = { headers: { origin: "https://evil.com" } };
    const res = {
      setHeader(name, value) { if (name === "Access-Control-Allow-Origin") setOrigin = value; },
      writeHead() {},
      end() {},
    };
    corsMw(req, res, () => {});

    assert.equal(setOrigin, "https://app.example.com");
  });

  test("allows comma-separated origins", async () => {
    const { createCorsMiddleware } = await loadCors();
    const corsMw = createCorsMiddleware("https://a.com,https://b.com");

    let setOrigin = null;
    const req = { headers: { origin: "https://b.com" } };
    const res = {
      setHeader(name, value) { if (name === "Access-Control-Allow-Origin") setOrigin = value; },
      writeHead() {},
      end() {},
    };
    corsMw(req, res, () => {});

    assert.equal(setOrigin, "https://b.com");
  });

  test("allows any origin when CORS_ORIGIN is empty", async () => {
    const { createCorsMiddleware } = await loadCors();
    const corsMw = createCorsMiddleware("");

    let setOrigin = null;
    const req = { headers: { origin: "https://anything.com" } };
    const res = {
      setHeader(name, value) { if (name === "Access-Control-Allow-Origin") setOrigin = value; },
      writeHead() {},
      end() {},
    };
    corsMw(req, res, () => {});

    assert.equal(setOrigin, "*");
  });

  test("rejects server-to-server request with no origin", async () => {
    const { createCorsMiddleware } = await loadCors();
    const corsMw = createCorsMiddleware("https://app.example.com");

    let setOrigin = null;
    const req = { headers: {} };
    const res = {
      setHeader(name, value) { if (name === "Access-Control-Allow-Origin") setOrigin = value; },
      writeHead() {},
      end() {},
    };
    corsMw(req, res, () => {});

    assert.equal(setOrigin, "*");
  });
});
