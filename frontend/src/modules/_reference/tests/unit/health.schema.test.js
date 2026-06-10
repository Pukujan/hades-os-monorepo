import { test } from "node:test";
import assert from "node:assert/strict";
import { isHealthResponse } from "../../schemas/health.schema.js";

test("isHealthResponse validates shape", () => {
  assert.equal(isHealthResponse({ status: "ok" }), true);
  assert.equal(isHealthResponse(null), false);
});
