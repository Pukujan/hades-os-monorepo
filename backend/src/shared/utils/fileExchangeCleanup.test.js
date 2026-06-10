import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, access, readdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { clearFileExchange } from "./fileExchangeCleanup.js";

test("clearFileExchange dryRun previews removable paths", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "fx-clear-"));
  await mkdir(join(repoRoot, "file-exchange/imports/2026-05-23_15-59-43Z"), {
    recursive: true
  });
  await writeFile(join(repoRoot, "file-exchange/imports/.gitkeep"), "");
  await mkdir(join(repoRoot, "file-exchange/exports/2026-05-24_01-00-00Z_consolidated"), {
    recursive: true
  });
  await writeFile(join(repoRoot, "file-exchange/exports/consolidated-models.json"), "{}");
  await mkdir(join(repoRoot, "file-exchange/exports/templates"), { recursive: true });
  await writeFile(join(repoRoot, "file-exchange/exports/.gitkeep"), "");

  const preview = await clearFileExchange({ repoRoot, dryRun: true });
  assert.equal(preview.status, "preview");
  assert.ok(preview.removed.includes("imports/2026-05-23_15-59-43Z"));
  assert.ok(preview.removed.includes("exports/2026-05-24_01-00-00Z_consolidated"));
  assert.ok(preview.skipped.includes("exports/consolidated-models.json"));
  assert.ok(preview.skipped.includes("exports/templates"));

  await access(join(repoRoot, "file-exchange/imports/2026-05-23_15-59-43Z"));
});

test("clearFileExchange confirm removes dated folders", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "fx-clear-"));
  await mkdir(join(repoRoot, "file-exchange/imports/2026-05-23_15-59-43Z"), {
    recursive: true
  });
  await writeFile(join(repoRoot, "file-exchange/imports/.gitkeep"), "");
  await mkdir(join(repoRoot, "file-exchange/exports/2026-05-24_01-00-00Z_live-batch-run"), {
    recursive: true
  });
  await writeFile(join(repoRoot, "file-exchange/exports/consolidated-models.json"), "{}");
  await writeFile(join(repoRoot, "file-exchange/exports/.gitkeep"), "");

  const result = await clearFileExchange({ repoRoot, confirm: true });
  assert.equal(result.status, "cleared");
  assert.equal(result.removedCount, 2);

  const imports = await readdir(join(repoRoot, "file-exchange/imports"));
  assert.deepEqual(imports, [".gitkeep"]);

  const exports = await readdir(join(repoRoot, "file-exchange/exports"));
  assert.ok(exports.includes("consolidated-models.json"));
  assert.ok(exports.includes(".gitkeep"));
  assert.equal(exports.includes("2026-05-24_01-00-00Z_live-batch-run"), false);
});
