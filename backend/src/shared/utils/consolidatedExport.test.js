import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, access } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  beginConsolidatedExportSession,
  consolidatedExportFolderName,
  writeConsolidatedExport,
  CONSOLIDATED_MANIFEST_FILENAME
} from "./consolidatedExport.js";

test("writeConsolidatedExport writes dated folder and latest copy", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "consolidated-export-"));
  delete process.env.CONSOLIDATED_EXPORT_STAMP;

  try {
    const session = beginConsolidatedExportSession({ stamp: "2026-05-23_15-59-43Z" });
    assert.equal(session.folderName, "2026-05-23_15-59-43Z_consolidated");

    const written = await writeConsolidatedExport(
      repoRoot,
      "consolidated-models.json",
      '{"meta":{"condensedBy":"test"}}',
      { stamp: session.stamp, condensedBy: "test" }
    );

    assert.ok(written.exportPath.includes("2026-05-23_15-59-43Z_consolidated/consolidated-models.json"));

    await access(join(repoRoot, "file-exchange/exports/2026-05-23_15-59-43Z_consolidated/consolidated-models.json"));
    await access(join(repoRoot, "file-exchange/exports/consolidated-models.json"));

    const manifest = JSON.parse(
      await readFile(
        join(
          repoRoot,
          "file-exchange/exports",
          consolidatedExportFolderName(session.stamp),
          CONSOLIDATED_MANIFEST_FILENAME
        ),
        "utf8"
      )
    );
    assert.equal(manifest.stamp, "2026-05-23_15-59-43Z");
    assert.ok(manifest.artifacts.some((a) => a.filename === "consolidated-models.json"));
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
    delete process.env.CONSOLIDATED_EXPORT_STAMP;
  }
});
