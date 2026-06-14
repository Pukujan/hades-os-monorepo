import { test } from "node:test";
import assert from "node:assert/strict";
import { getHadesConfig } from "../../config/index.js";

function withEnv(overrides, fn) {
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
    return fn();
  } finally {
    for (const [key, snapshot] of previous.entries()) {
      if (snapshot.had) process.env[key] = snapshot.value;
      else delete process.env[key];
    }
  }
}

test("Hades config exposes hosted readiness flags without leaking secret values", () => {
  withEnv(
    {
      NODE_ENV: "production",
      CORS_ORIGIN: "https://hades.example",
      SUPABASE_URL: "https://supabase.example",
      SUPABASE_SERVICE_ROLE_KEY: "supabase-secret",
      OPENROUTER_API_KEY: "openrouter-secret",
      OPENROUTER_MODEL: "deepseek/deepseek-v4-flash"
    },
    () => {
      const config = getHadesConfig();

      assert.equal(config.openRouterModel, "deepseek/deepseek-v4-flash");
      assert.equal(config.readiness.mode, "hosted");
      assert.equal(config.readiness.storage.mode, "supabase");
      assert.equal(config.readiness.storage.configured, true);
      assert.equal(config.readiness.ai.provider, "openrouter");
      assert.equal(config.readiness.ai.model, "deepseek/deepseek-v4-flash");
      assert.equal(config.readiness.ai.configured, true);
      assert.equal(config.readiness.cors.origin, "https://hades.example");

      const serialized = JSON.stringify(config.readiness);
      assert.equal(serialized.includes("openrouter-secret"), false);
      assert.equal(serialized.includes("supabase-secret"), false);
    }
  );
});

test("Hades config exposes telegramBotToken without leaking", () => {
  withEnv(
    {
      TELEGRAM_BOT_TOKEN: "telegram-secret-123"
    },
    () => {
      const config = getHadesConfig();
      assert.equal(config.telegramBotToken, "telegram-secret-123");
    }
  );
});

test("Hades config defaults telegramBotToken to empty string", () => {
  withEnv(
    {
      TELEGRAM_BOT_TOKEN: undefined
    },
    () => {
      const config = getHadesConfig();
      assert.equal(config.telegramBotToken, "");
    }
  );
});

test("Hades config keeps local development usable when hosted secrets are missing", () => {
  withEnv(
    {
      NODE_ENV: "development",
      CORS_ORIGIN: undefined,
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      OPENROUTER_API_KEY: undefined,
      OPENROUTER_MODEL: undefined
    },
    () => {
      const config = getHadesConfig();

      assert.equal(config.openRouterModel, "deepseek/deepseek-v4-flash");
      assert.equal(config.readiness.mode, "local");
      assert.equal(config.readiness.storage.mode, "memory");
      assert.equal(config.readiness.storage.configured, false);
      assert.equal(config.readiness.ai.provider, "openrouter");
      assert.equal(config.readiness.ai.configured, false);
      assert.equal(config.readiness.cors.origin, null);
    }
  );
});
