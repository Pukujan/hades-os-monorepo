import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { createTestApp } from "../../../../shared/testing/create-test-app.js";
import { invokeApp } from "../../../../shared/testing/invoke-app.js";

test("POST /api/model-condenser/condense regenerates consolidated file", async () => {
  const modelsDir = await mkdtemp(join(tmpdir(), "model-condenser-api-"));
  process.env.MODEL_CONDENSER_OUTPUT_DIR = modelsDir;

  const { register } = await import("../../index.js");
  const app = await createTestApp(register);

  try {
    const res = await invokeApp(app, {
      method: "POST",
      path: "/api/model-condenser/condense",
      body: { includePayload: false }
    });

    assert.equal(res.status, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.status, "condensed");
    assert.ok(body.modelCount >= 1);
    assert.ok(body.outputPath.includes("consolidated-models.json"));

    const getRes = await invokeApp(app, {
      method: "GET",
      path: "/api/model-condenser/consolidated"
    });
    assert.equal(getRes.status, 200);
    const summary = JSON.parse(getRes.body);
    assert.equal(summary.status, "ready");
    assert.equal(summary.modelCount, body.modelCount);
  } finally {
    delete process.env.MODEL_CONDENSER_OUTPUT_DIR;
    await rm(modelsDir, { recursive: true, force: true });
  }
});
