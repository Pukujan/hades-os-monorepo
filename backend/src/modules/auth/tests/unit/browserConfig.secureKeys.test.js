import assert from "node:assert/strict";
import { test } from "node:test";

import { createTestApp } from "../../../../shared/testing/create-test-app.js";
import { register } from "../../index.js";

function invokeJson(app, { method = "GET", url = "/", headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = {
      method,
      url,
      originalUrl: url,
      headers,
      get(name) {
        return headers[String(name).toLowerCase()] || headers[name] || null;
      }
    };

    const res = {
      statusCode: 200,
      headers: {},
      setHeader(name, value) {
        this.headers[String(name).toLowerCase()] = value;
      },
      getHeader(name) {
        return this.headers[String(name).toLowerCase()] || null;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.setHeader("content-type", "application/json");
        this.end(JSON.stringify(body));
        return this;
      },
      end(body) {
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: typeof body === "string" && body.length ? JSON.parse(body) : null
        });
      }
    };

    app.handle(req, res, reject);
  });
}

const SAFE_ENV = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_example",
  APP_URL: "https://hades.example",
  CORS_ORIGIN: "https://ignored.example",
};

/**
 * Group F — Browser Config
 *
 * Rule: /api/auth/browser-config responds ONLY with:
 *   - supabaseUrl
 *   - supabaseAnonKey
 * It must NOT expose SERVICE_ROLE_KEY, OPENROUTER_API_KEY, or any other
 * backend-only secret.
 */

test("browser-config only returns supabaseUrl and supabaseAnonKey", async () => {
  const previous = Object.fromEntries(
    Object.keys(SAFE_ENV).map((k) => [k, process.env[k]])
  );
  Object.assign(process.env, SAFE_ENV);

  const LEAKY_ENV = {
    SUPABASE_SERVICE_ROLE_KEY: "sb_service_role_secret",
    OPENROUTER_API_KEY: "sk-or-secret",
    HERMES_MODE: "hermes_required",
    HADES_USER_ID: "admin",
  };
  Object.assign(process.env, LEAKY_ENV);

  try {
    const app = await createTestApp(register);
    const response = await invokeJson(app, { method: "GET", url: "/api/auth/browser-config" });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.supabaseUrl, SAFE_ENV.SUPABASE_URL);
    assert.equal(response.body.supabaseAnonKey, SAFE_ENV.SUPABASE_ANON_KEY);

    const keys = Object.keys(response.body);
    for (const key of keys) {
      assert.ok(
        ["supabaseUrl", "supabaseAnonKey"].includes(key),
        `Unexpected key in browser-config: ${key}`
      );
    }
  } finally {
    Object.assign(process.env, previous);
    for (const key of Object.keys(LEAKY_ENV)) {
      delete process.env[key];
    }
  }
});

test("browser-config does not include appUrl or any app-specific keys", async () => {
  const previous = Object.fromEntries(
    Object.keys(SAFE_ENV).map((k) => [k, process.env[k]])
  );
  Object.assign(process.env, SAFE_ENV);

  try {
    const app = await createTestApp(register);
    const response = await invokeJson(app, { method: "GET", url: "/api/auth/browser-config" });

    assert.equal(response.statusCode, 200);
    assert.equal(Object.keys(response.body).length, 2);
    assert.equal(response.body.appUrl, undefined);
  } finally {
    Object.assign(process.env, previous);
  }
});
