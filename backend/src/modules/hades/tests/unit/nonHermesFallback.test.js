import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * Group D — Non-Hermes Fallback Removal
 *
 * Rules:
 * 1. config/index.js must NOT export hermesMode with fallback values like
 *    "openrouter_with_fallback" — Hermes is required.
 * 2. hermes.service.js must NOT import or reference openRouterClient as a
 *    fallback when hermesRuntime fails.
 * 3. No conditional "if no Hermes, use OpenRouter" logic in the codebase.
 */

describe("config/index.js does not export fallback hermesMode", () => {
  test("getHadesConfig hermesRequired is true when HERMES_REQUIRED unset", async () => {
    const oldEnv = process.env.HERMES_REQUIRED;
    delete process.env.HERMES_REQUIRED;
    try {
      const { getHadesConfig } = await import("../../config/index.js");
      const cfg = getHadesConfig();
      assert.equal(cfg.hermesRequired, true, "hermesRequired should be true when unset");
    } finally {
      if (oldEnv !== undefined) process.env.HERMES_REQUIRED = oldEnv;
      else delete process.env.HERMES_REQUIRED;
    }
  });
});

describe("hermes.service.js never imports openRouterClient", () => {
  test("source does not contain openRouterClient import", async () => {
    const src = fs.readFileSync(
      new URL("../../services/hermes.service.js", import.meta.url),
      "utf8"
    );
    assert.ok(!src.includes("openRouter"), "hermes.service.js must not reference OpenRouter");
    assert.ok(!src.includes("openRouterClient"), "hermes.service.js must not import openRouterClient");
  });
});

describe("no conditional fallback to OpenRouter", () => {
  test("hermes.service.js does not have fallback logic", async () => {
    const src = fs.readFileSync(
      new URL("../../services/hermes.service.js", import.meta.url),
      "utf8"
    );
    assert.ok(!src.includes("fallback"), "hermes.service.js must not contain fallback logic");
  });
});
