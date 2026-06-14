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

test("GET /api/auth/browser-config returns only public auth config", async () => {
  const previous = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    APP_URL: process.env.APP_URL,
    CORS_ORIGIN: process.env.CORS_ORIGIN
  };

  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "sb_publishable_example";
  process.env.APP_URL = "https://hades.example";
  process.env.CORS_ORIGIN = "https://ignored.example";

  try {
    const app = await createTestApp(register);
    const response = await invokeJson(app, { method: "GET", url: "/api/auth/browser-config" });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "sb_publishable_example",
    });
  } finally {
    process.env.SUPABASE_URL = previous.SUPABASE_URL;
    process.env.SUPABASE_ANON_KEY = previous.SUPABASE_ANON_KEY;
    process.env.APP_URL = previous.APP_URL;
    process.env.CORS_ORIGIN = previous.CORS_ORIGIN;
  }
});
