#!/usr/bin/env node
/**
 * Model condenser CLI — calls POST /api/model-condenser/condense (or --local direct service).
 * Always copies consolidated-models.json → file-exchange/exports/.
 *
 * Usage:
 *   npm run condense-models
 *   node scripts/condense-models.mjs --local
 */
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const args = new Set(process.argv.slice(2));
const useLocal = args.has("--local");
const includePayload = args.has("--include-payload");
const baseUrl = process.env.API_BASE_URL || "http://localhost:3001";
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

async function condenseViaApi() {
  const res = await fetch(`${baseUrl}/api/model-condenser/condense`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ includePayload })
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || body.message || `HTTP ${res.status}`);
  }
  return body;
}

async function condenseLocal() {
  const { getModuleConfig } = await import(
    "../backend/src/modules/model-condenser/config/index.js"
  );
  const { condenseModels } = await import(
    "../backend/src/modules/model-condenser/services/modelCondenser.service.js"
  );
  const config = getModuleConfig();
  return condenseModels({
    repoRoot: config.repoRoot,
    consolidatedFilesDir: config.consolidatedFilesDir,
    consolidatedFileName: config.consolidatedFileName,
    includePayload
  });
}

try {
  const result = useLocal ? await condenseLocal() : await condenseViaApi();
  const {
    CONSOLIDATED_EXPORT_DIR,
    CONSOLIDATED_FILES_DIR,
    CONSOLIDATED_FILENAMES,
    writeConsolidatedExport
  } = await import("../backend/src/shared/utils/consolidatedExport.js");
  const modelsPath = join(repoRoot, CONSOLIDATED_FILES_DIR, CONSOLIDATED_FILENAMES.models);
  const json = await readFile(modelsPath, "utf8");
  const written = await writeConsolidatedExport(repoRoot, CONSOLIDATED_FILENAMES.models, json, {
    condensedBy: "model-condenser"
  });

  console.log(`Model condenser: ${result.modelCount} models`);
  console.log(`  → ${written.exportPath} (audit)`);
  console.log(`  → ${CONSOLIDATED_EXPORT_DIR}/${CONSOLIDATED_FILENAMES.models} (latest)`);
  console.log(`  → consolidated-files/${CONSOLIDATED_FILENAMES.models} (mirror)`);
  console.log(`Generated at: ${result.generatedAt}`);
} catch (error) {
  if (!useLocal) {
    console.error(`API condense failed (${error.message}). Retry with --local or start the backend.`);
  } else {
    console.error(error.message);
  }
  process.exit(1);
}
