import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { resolveArtifactPaths, loadLocalArtifactsConfig } from "./resolveArtifactPaths.js";

test("resolveArtifactPaths uses in-repo defaults without config", () => {
  const repoRoot = join(tmpdir(), "repo");
  const paths = resolveArtifactPaths(repoRoot, {});
  assert.equal(paths.artifactRoot, null);
  assert.equal(paths.batches, join(repoRoot, "data", "batches"));
  assert.equal(paths.fileExchange, join(repoRoot, "file-exchange"));
});

test("resolveArtifactPaths reads local-artifacts.json", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "artifacts-"));
  const root = join(repoRoot, "ext");
  await writeFile(
    join(repoRoot, "local-artifacts.json"),
    JSON.stringify({ artifactRoot: root, layout: { batches: "batches" } })
  );
  const cfg = loadLocalArtifactsConfig(repoRoot);
  assert.equal(cfg?.artifactRoot, root);
  const paths = resolveArtifactPaths(repoRoot, {});
  assert.equal(paths.artifactRoot, root);
  assert.equal(paths.batches, join(root, "batches"));
  assert.equal(paths.fileExchangeImports, join(root, "file-exchange", "imports"));
});

test("ENV overrides artifactRoot paths", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "artifacts-env-"));
  const root = join(repoRoot, "ext");
  await writeFile(join(repoRoot, "local-artifacts.json"), JSON.stringify({ artifactRoot: root }));
  const customBatch = join(repoRoot, "custom-batches");
  await mkdir(customBatch, { recursive: true });
  const paths = resolveArtifactPaths(repoRoot, { CASE_FILING_BATCH_DIR: customBatch });
  assert.equal(paths.batches, customBatch);
});
