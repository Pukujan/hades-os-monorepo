import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { createTestApp } from "../../../../shared/testing/create-test-app.js";

test("POST /api/model-condenser/condense regenerates consolidated file", async () => {
  const modelsDir = await mkdtemp(join(tmpdir(), "model-condenser-api-"));
  process.env.MODEL_CONDENSER_OUTPUT_DIR = modelsDir;

  const { register } = await import("../../index.js");
  const app = await createTestApp(register);
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/model-condenser/condense`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includePayload: false })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.status, "condensed");
    assert.ok(body.modelCount >= 1);
    assert.ok(body.outputPath.includes("consolidated-models.json"));

    const getRes = await fetch(`http://127.0.0.1:${port}/api/model-condenser/consolidated`);
    assert.equal(getRes.status, 200);
    const summary = await getRes.json();
    assert.equal(summary.status, "ready");
    assert.equal(summary.modelCount, body.modelCount);
  } finally {
    server.close();
    delete process.env.MODEL_CONDENSER_OUTPUT_DIR;
    await rm(modelsDir, { recursive: true, force: true });
  }
});
