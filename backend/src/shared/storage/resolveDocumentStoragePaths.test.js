import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { resolveDocumentStoragePaths, documentBlobPath } from "./resolveDocumentStoragePaths.js";

test("resolveDocumentStoragePaths uses in-repo default", () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "doc-storage-"));
  const paths = resolveDocumentStoragePaths(repoRoot, {});
  assert.equal(paths.uploads, join(repoRoot, "data", "uploads"));
  assert.equal(paths.artifactRoot, null);
});

test("resolveDocumentStoragePaths reads local-artifacts.json", () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "doc-storage-"));
  const root = join(repoRoot, "external");
  writeFileSync(
    join(repoRoot, "local-artifacts.json"),
    JSON.stringify({ artifactRoot: root, layout: { uploads: "uploads" } })
  );
  const paths = resolveDocumentStoragePaths(repoRoot, {});
  assert.equal(paths.uploads, join(root, "uploads"));
  assert.equal(paths.artifactRoot, root);
});

test("UPLOADS_ROOT overrides artifact layout", () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "doc-storage-"));
  const custom = join(repoRoot, "custom-uploads");
  const paths = resolveDocumentStoragePaths(repoRoot, { UPLOADS_ROOT: custom });
  assert.equal(paths.uploads, custom);
});

test("documentBlobPath builds original.{ext} under document folder", () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "doc-storage-"));
  const paths = resolveDocumentStoragePaths(repoRoot, {});
  const blob = documentBlobPath(paths, "doc-001", "pdf");
  assert.equal(blob, join(paths.uploads, "doc-001", "original.pdf"));
});
