import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "../../../../shared/testing/create-test-app.js";
import { register } from "../../index.js";

test("GET /api/_reference/health", async () => {
  const app = await createTestApp(register);
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/_reference/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.module, "_reference");
    assert.equal(body.status, "ok");
  } finally {
    server.close();
  }
});
