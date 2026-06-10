import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { condenseModels } from "../../services/modelCondenser.service.js";
import { getModuleConfig } from "../../config/index.js";

const { repoRoot } = getModuleConfig();

test("condenseModels writes consolidated-models.json", async () => {
  const modelsDir = await mkdtemp(join(tmpdir(), "model-condenser-"));
  try {
    const result = await condenseModels({
      repoRoot,
      modelsDir,
      consolidatedFileName: "consolidated-models.json"
    });

    assert.equal(result.status, "condensed");
    assert.ok(result.modelCount >= 1);

    const raw = await readFile(join(modelsDir, "consolidated-models.json"), "utf8");
    const parsed = JSON.parse(raw);
    assert.equal(parsed.meta.condensedBy, "model-condenser");
    assert.ok(parsed.inventory.some((entry) => entry.id === "ReferenceHealth"));
  } finally {
    await rm(modelsDir, { recursive: true, force: true });
  }
});
