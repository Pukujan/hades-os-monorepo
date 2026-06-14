import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Supabase production env ops", () => {
  test("documents required production env vars", () => {
    const required = [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "ENCRYPTION_KEY",
    ];

    assert.deepEqual(required, [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "ENCRYPTION_KEY",
    ]);
  });

  if (process.env.CI_PRODUCTION_ENV_CHECK === "true") {
    test("production env vars are present when CI_PRODUCTION_ENV_CHECK is enabled", () => {
      assert.ok(process.env.SUPABASE_URL, "SUPABASE_URL is set");
      assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY is set");
      assert.ok(process.env.ENCRYPTION_KEY, "ENCRYPTION_KEY is set");
    });
  }
});
