import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));

const RAILWAY_BASE = "https://hades-os-monorepo-production.up.railway.app";

function mockEnv({ mode = "production", apiBaseUrl = RAILWAY_BASE } = {}) {
  globalThis.importMetaEnvShim = { MODE: mode, VITE_API_BASE_URL: apiBaseUrl };
}

beforeEach(() => {
  delete globalThis.importMetaEnvShim;
});

afterEach(() => {
  delete globalThis.importMetaEnvShim;
});

test("source must not use optional chaining on import.meta.env", () => {
  const source = readFileSync(join(here, "apiUrl.js"), "utf8");
  assert.doesNotMatch(source, /import\.meta\?\.env/);
  assert.doesNotMatch(source, /import\.meta\.env\?/);
});

test("getApiBaseUrl returns VITE_API_BASE_URL in production", async () => {
  mockEnv({ mode: "production", apiBaseUrl: RAILWAY_BASE });
  const { getApiBaseUrl } = await import("./apiUrl.js");
  assert.equal(getApiBaseUrl(), RAILWAY_BASE);
});

test("getApiBaseUrl falls back to localhost:3001 in development", async () => {
  mockEnv({ mode: "development", apiBaseUrl: "" });
  const { getApiBaseUrl } = await import("./apiUrl.js");
  assert.equal(getApiBaseUrl(), "http://localhost:3001");
});

test("getApiBaseUrl strips trailing slash", async () => {
  mockEnv({ mode: "production", apiBaseUrl: `${RAILWAY_BASE}/` });
  const { getApiBaseUrl } = await import("./apiUrl.js");
  assert.equal(getApiBaseUrl(), RAILWAY_BASE);
});

test("getApiBaseUrl throws in production when VITE_API_BASE_URL is missing", async () => {
  mockEnv({ mode: "production", apiBaseUrl: "" });
  const { getApiBaseUrl } = await import("./apiUrl.js");
  assert.throws(() => getApiBaseUrl(), /VITE_API_BASE_URL/);
});

test("apiUrl prepends base URL to path", async () => {
  mockEnv({ mode: "production", apiBaseUrl: RAILWAY_BASE });
  const { apiUrl } = await import("./apiUrl.js");
  assert.equal(apiUrl("/api/hades/chat/general"), `${RAILWAY_BASE}/api/hades/chat/general`);
});

test("apiUrl supports importMetaEnvShim for test injection", async () => {
  mockEnv({ mode: "production", apiBaseUrl: RAILWAY_BASE });
  const { apiUrl } = await import("./apiUrl.js");
  assert.equal(apiUrl("/test"), `${RAILWAY_BASE}/test`);
});

test("apiUrl uses localhost:3001 in dev when no env var set", async () => {
  mockEnv({ mode: "development", apiBaseUrl: "" });
  const { apiUrl } = await import("./apiUrl.js");
  assert.equal(apiUrl("/api/test"), "http://localhost:3001/api/test");
});
