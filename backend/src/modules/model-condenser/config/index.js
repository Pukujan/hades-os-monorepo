import { join } from "path";
import { fileURLToPath } from "url";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "../../../../..");

export function getModuleConfig() {
  const consolidatedFilesDir =
    process.env.MODEL_CONDENSER_OUTPUT_DIR ||
    process.env.CONSOLIDATED_FILES_DIR ||
    join(repoRoot, "consolidated-files");
  return {
    name: "model-condenser",
    label: "Model Condenser",
    repoRoot,
    consolidatedFilesDir,
    /** @deprecated use consolidatedFilesDir */
    modelsDir: consolidatedFilesDir,
    consolidatedFileName:
      process.env.MODEL_CONDENSER_OUTPUT_FILE || "consolidated-models.json"
  };
}

/** @deprecated Prefer getModuleConfig() */
export const moduleConfig = getModuleConfig();
