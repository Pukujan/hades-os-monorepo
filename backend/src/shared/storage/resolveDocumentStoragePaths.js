import { join } from "path";
import { loadLocalArtifactsConfig } from "../config/resolveArtifactPaths.js";

/** @typedef {import("./resolveDocumentStoragePaths.types.js").DocumentStoragePaths} DocumentStoragePaths */

/**
 * @param {string} repoRoot
 * @param {Record<string, string | undefined>} [env]
 * @returns {DocumentStoragePaths}
 */
export function resolveDocumentStoragePaths(repoRoot, env = process.env) {
  const cfg = loadLocalArtifactsConfig(repoRoot);
  const layout = { uploads: "uploads", ...(cfg?.layout ?? {}) };
  const artifactRoot = env.ARTIFACT_ROOT?.trim() || cfg?.artifactRoot?.trim() || null;
  const inRepoUploads = join(repoRoot, "data/uploads");

  const uploads =
    env.UPLOADS_ROOT?.trim() ||
    (artifactRoot ? join(artifactRoot, layout.uploads) : inRepoUploads);

  return {
    repoRoot,
    artifactRoot,
    uploads
  };
}

/**
 * @param {DocumentStoragePaths} paths
 * @param {string} documentId
 * @returns {string}
 */
export function documentFolderPath(paths, documentId) {
  return join(paths.uploads, documentId);
}

/**
 * @param {DocumentStoragePaths} paths
 * @param {string} documentId
 * @param {string} extension
 * @returns {string}
 */
export function documentBlobPath(paths, documentId, extension) {
  const ext = extension.startsWith(".") ? extension.slice(1) : extension;
  return join(documentFolderPath(paths, documentId), `original.${ext}`);
}
