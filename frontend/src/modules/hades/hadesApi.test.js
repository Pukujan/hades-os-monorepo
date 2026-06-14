import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const RAILWAY_API_BASE = "https://hades-os-monorepo-production.up.railway.app";
const VERCEL_ORIGIN = "https://hades-os-monorepo.vercel.app";

function mockEnv({ mode = "production", apiBaseUrl = RAILWAY_API_BASE } = {}) {
  globalThis.importMetaEnvShim = { MODE: mode, VITE_API_BASE_URL: apiBaseUrl };
}

let fetchCalls;
let originalFetch;

beforeEach(() => {
  fetchCalls = [];
  originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    fetchCalls.push({ url, options });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete globalThis.importMetaEnvShim;
});

test("uses VITE_API_BASE_URL for production Hades chat requests", async () => {
  mockEnv({ mode: "production", apiBaseUrl: RAILWAY_API_BASE });

  const { sendHadesChatMessage } = await import("./hadesApi.js");

  await sendHadesChatMessage({
    mode: "general",
    message: "test",
    token: "fake-token"
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0].url,
    `${RAILWAY_API_BASE}/api/hades/chat/general`
  );
});

test("trims trailing slash from VITE_API_BASE_URL", async () => {
  mockEnv({ mode: "production", apiBaseUrl: `${RAILWAY_API_BASE}/` });

  const { sendHadesChatMessage } = await import("./hadesApi.js");

  await sendHadesChatMessage({
    mode: "general",
    message: "test",
    token: "fake-token"
  });

  const url = fetchCalls[0].url;
  assert.equal(url, `${RAILWAY_API_BASE}/api/hades/chat/general`);
  assert.equal(url.includes(".app//api/"), false);
});

test("does not call Vercel same-origin API in production", async () => {
  mockEnv({ mode: "production", apiBaseUrl: RAILWAY_API_BASE });

  const { sendHadesChatMessage } = await import("./hadesApi.js");

  await sendHadesChatMessage({
    mode: "general",
    message: "test",
    token: "fake-token"
  });

  const url = fetchCalls[0].url;
  assert.notEqual(url, "/api/hades/chat/general");
  assert.notEqual(url, `${VERCEL_ORIGIN}/api/hades/chat/general`);
  assert.equal(url.startsWith(RAILWAY_API_BASE), true);
});

test("fails loudly in production when VITE_API_BASE_URL is missing", async () => {
  mockEnv({ mode: "production", apiBaseUrl: "" });

  const { sendHadesChatMessage } = await import("./hadesApi.js");

  await assert.rejects(
    sendHadesChatMessage({
      mode: "general",
      message: "test",
      token: "fake-token"
    }),
    /VITE_API_BASE_URL/
  );

  assert.equal(fetchCalls.length, 0);
});

test("allows relative API path only in development when VITE_API_BASE_URL is missing", async () => {
  mockEnv({ mode: "development", apiBaseUrl: "" });

  const { sendHadesChatMessage } = await import("./hadesApi.js");

  await sendHadesChatMessage({
    mode: "general",
    message: "test",
    token: "fake-token"
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, "/api/hades/chat/general");
});
