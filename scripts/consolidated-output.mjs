import { mkdir, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  CONSOLIDATED_EXPORT_DIR,
  CONSOLIDATED_FILES_DIR,
  CONSOLIDATED_FILENAMES,
  writeConsolidatedExport,
  getConsolidatedExportStamp
} from "../backend/src/shared/utils/consolidatedExport.js";
import { resolveArtifactPaths } from "../backend/src/shared/config/resolveArtifactPaths.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export {
  CONSOLIDATED_EXPORT_DIR,
  CONSOLIDATED_FILES_DIR,
  CONSOLIDATED_FILENAMES,
  getConsolidatedExportStamp,
  beginConsolidatedExportSession
} from "../backend/src/shared/utils/consolidatedExport.js";

/** Repo-relative paths: dated exports/ folder is primary audit trail; consolidated-files/ is latest mirror. */
export const CONSOLIDATED_ARTIFACTS = {
  models: {
    filename: CONSOLIDATED_FILENAMES.models,
    mirrorPath: `${CONSOLIDATED_FILES_DIR}/${CONSOLIDATED_FILENAMES.models}`
  },
  prompts: {
    filename: CONSOLIDATED_FILENAMES.prompts,
    mirrorPath: `${CONSOLIDATED_FILES_DIR}/${CONSOLIDATED_FILENAMES.prompts}`
  },
  fileStructure: {
    filename: CONSOLIDATED_FILENAMES.fileStructure,
    mirrorPath: `${CONSOLIDATED_FILES_DIR}/${CONSOLIDATED_FILENAMES.fileStructure}`
  },
  contracts: {
    filename: CONSOLIDATED_FILENAMES.contracts,
    mirrorPath: `${CONSOLIDATED_FILES_DIR}/${CONSOLIDATED_FILENAMES.contracts}`
  }
};

/**
 * Write JSON to dated file-exchange/exports/{stamp}_consolidated/ and consolidated-files/ mirror.
 * @param {"models"|"prompts"|"fileStructure"|"contracts"} kind
 * @param {object} doc
 */
export async function writeConsolidatedArtifact(kind, doc) {
  const spec = CONSOLIDATED_ARTIFACTS[kind];
  const json = JSON.stringify(doc, null, 2);
  const condensedBy = doc?.meta?.condensedBy ?? null;
  const written = await writeConsolidatedExport(repoRoot, spec.filename, json, {
    condensedBy
  });

  const { consolidatedFiles, fileExchangeExports } = resolveArtifactPaths(repoRoot);
  const mirrorAbs = join(consolidatedFiles, spec.filename);
  await mkdir(consolidatedFiles, { recursive: true });
  await writeFile(mirrorAbs, json);

  return {
    exportPath: written.exportPath,
    datedExportDir: written.datedExportDir,
    stamp: written.stamp,
    folderName: written.folderName,
    mirrorPath: spec.mirrorPath,
    latestExportPath: `${fileExchangeExports}/${spec.filename}`
  };
}
