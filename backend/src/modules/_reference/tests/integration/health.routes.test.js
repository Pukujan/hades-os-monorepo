import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "../../../../shared/testing/create-test-app.js";
import { invokeApp } from "../../../../shared/testing/invoke-app.js";
import { register } from "../../index.js";

test("GET /api/_reference/health", async () => {
  const app = await createTestApp(register);
  const response = await invokeApp(app, { method: "GET", path: "/api/_reference/health" });
  assert.equal(response.status, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.module, "_reference");
  assert.equal(body.status, "ok");
});
