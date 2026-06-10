/** @readonly Consolidated repo snapshot exports contract. */

export {
  CONSOLIDATED_EXPORT_DIR,
  CONSOLIDATED_FILES_DIR,
  CONSOLIDATED_FILENAMES,
  writeConsolidatedExport
} from "../utils/consolidatedExport.js";

export const CONSOLIDATED_EXPORTS_VERSION = "v001";

/** Latest mirror for consolidated-*.json (all condense scripts + model-condenser API). */
export const CONSOLIDATED_FILES_MIRROR_DIR = "consolidated-files";

/** @deprecated use CONSOLIDATED_FILES_MIRROR_DIR */
export const CONSOLIDATED_MODELS_MIRROR_DIR = CONSOLIDATED_FILES_MIRROR_DIR;

export const CONSOLIDATED_NPM_SCRIPTS = {
  models: "condense-models",
  prompts: "condense-prompts",
  fileStructure: "condense-file-structure",
  contracts: "condense-contracts",
  all: "condense:all"
};
