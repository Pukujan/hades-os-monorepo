import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../../../../core/app.js";
import { invokeApp } from "../../../../shared/testing/invoke-app.js";

async function withEnv(overrides, fn) {
  const previous = new Map();
  for (const key of Object.keys(overrides)) {
    previous.set(key, {
      had: Object.hasOwn(process.env, key),
      value: process.env[key]
    });
    if (overrides[key] === undefined) delete process.env[key];
    else process.env[key] = overrides[key];
  }

  try {
    return await fn();
  } finally {
    for (const [key, snapshot] of previous.entries()) {
      if (snapshot.had) process.env[key] = snapshot.value;
      else delete process.env[key];
    }
  }
}

test("GET /api/hades/readiness returns non-secret hosted runtime status", async () => {
  await withEnv(
    {
      NODE_ENV: "production",
      CORS_ORIGIN: "https://hades.example",
      SUPABASE_URL: "https://supabase.example",
      SUPABASE_SERVICE_ROLE_KEY: "supabase-secret",
      OPENROUTER_API_KEY: "openrouter-secret",
      OPENROUTER_MODEL: "deepseek/deepseek-v4-flash"
    },
    async () => {
      const { app } = await createApp();
      const response = await invokeApp(app, {
        method: "GET",
        path: "/api/hades/readiness"
      });

      assert.equal(response.status, 200);
      const body = JSON.parse(response.body);
      assert.equal(body.status, "ok");
      assert.equal(body.mode, "hosted");
      assert.deepEqual(body.deploy, {
        backendPlatform: "railway",
        frontendPlatform: "vercel"
      });
      assert.equal(body.storage.mode, "supabase");
      assert.equal(body.storage.configured, true);
      assert.equal(body.ai.provider, "openrouter");
      assert.equal(body.ai.model, "deepseek/deepseek-v4-flash");
      assert.equal(body.ai.configured, true);
      assert.equal(body.cors.origin, "https://hades.example");

      assert.equal(response.body.includes("openrouter-secret"), false);
      assert.equal(response.body.includes("supabase-secret"), false);
      assert.equal(response.body.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
      assert.equal(response.body.includes("OPENROUTER_API_KEY"), false);
    }
  );
});

test("GET /api/hades/readiness reports local fallback when hosted services are not configured", async () => {
  await withEnv(
    {
      NODE_ENV: "development",
      CORS_ORIGIN: undefined,
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      OPENROUTER_API_KEY: undefined
    },
    async () => {
      const { app } = await createApp();
      const response = await invokeApp(app, {
        method: "GET",
        path: "/api/hades/readiness"
      });

      assert.equal(response.status, 200);
      const body = JSON.parse(response.body);
      assert.equal(body.status, "ok");
      assert.equal(body.mode, "local");
      assert.equal(body.storage.mode, "memory");
      assert.equal(body.storage.configured, false);
      assert.equal(body.ai.provider, "openrouter");
      assert.equal(body.ai.configured, false);
      assert.equal(body.cors.origin, null);
    }
  );
});
