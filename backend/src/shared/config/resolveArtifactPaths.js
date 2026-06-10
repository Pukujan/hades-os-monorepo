import { existsSync, readFileSync } from "fs";
import { join } from "path";

/** @typedef {import("./resolveArtifactPaths.types.js").ArtifactPaths} ArtifactPaths */

export const DEFAULT_ARTIFACT_LAYOUT = {
  batches: "batches",
  fileExchange: "file-exchange",
  evalBundles: "eval-bundles",
  caseExports: "case-exports",
  docExports: "doc-exports"
};

/**
 * @param {string} repoRoot
 * @returns {{ artifactRoot?: string, layout?: Record<string, string> } | null}
 */
export function loadLocalArtifactsConfig(repoRoot) {
  const configPath = join(repoRoot, "local-artifacts.json");
  if (!existsSync(configPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(configPath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Resolve runtime artifact directories.
 * Precedence: per-path ENV override > local-artifacts.json > in-repo defaults.
 *
 * @param {string} repoRoot
 * @param {Record<string, string | undefined>} [env]
 * @returns {ArtifactPaths}
 */
export function resolveArtifactPaths(repoRoot, env = process.env) {
  const cfg = loadLocalArtifactsConfig(repoRoot);
  const layout = { ...DEFAULT_ARTIFACT_LAYOUT, ...(cfg?.layout ?? {}) };
  const artifactRoot = env.ARTIFACT_ROOT?.trim() || cfg?.artifactRoot?.trim() || null;

  const inRepoFileExchange = join(repoRoot, "file-exchange");
  const inRepo = {
    batches: join(repoRoot, "data/batches"),
    fileExchange: inRepoFileExchange,
    fileExchangeImports: join(inRepoFileExchange, "imports"),
    fileExchangeExports: join(inRepoFileExchange, "exports"),
    evalBundles: join(repoRoot, "eval-bundles"),
    caseExports: join(repoRoot, "case-exports"),
    docExports: join(repoRoot, "doc-exports"),
    consolidatedFiles: join(repoRoot, "consolidated-files")
  };

  if (!artifactRoot) {
    const fileExchange = env.FILE_EXCHANGE_ROOT?.trim() || inRepo.fileExchange;
    return {
      repoRoot,
      artifactRoot: null,
      layout,
      batches: env.CASE_FILING_BATCH_DIR?.trim() || inRepo.batches,
      fileExchange,
      fileExchangeImports: join(fileExchange, "imports"),
      fileExchangeExports: join(fileExchange, "exports"),
      evalBundles: env.EVAL_BUNDLE_ROOT_DIR?.trim() || inRepo.evalBundles,
      caseExports: env.CASE_EXPORT_ROOT_DIR?.trim() || inRepo.caseExports,
      docExports: inRepo.docExports,
      consolidatedFiles: inRepo.consolidatedFiles
    };
  }

  const fileExchange = env.FILE_EXCHANGE_ROOT?.trim() || join(artifactRoot, layout.fileExchange);
  return {
    repoRoot,
    artifactRoot,
    layout,
    batches: env.CASE_FILING_BATCH_DIR?.trim() || join(artifactRoot, layout.batches),
    fileExchange,
    fileExchangeImports: join(fileExchange, "imports"),
    fileExchangeExports: join(fileExchange, "exports"),
    evalBundles: env.EVAL_BUNDLE_ROOT_DIR?.trim() || join(artifactRoot, layout.evalBundles),
    caseExports: env.CASE_EXPORT_ROOT_DIR?.trim() || join(artifactRoot, layout.caseExports),
    docExports: join(artifactRoot, layout.docExports),
    consolidatedFiles: join(artifactRoot, "consolidated-files")
  };
}
