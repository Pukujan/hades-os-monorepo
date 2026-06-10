import { readFile, writeFile, mkdir } from "fs/promises";
import { join, relative } from "path";

/**
 * Platform-only schema inventory for scaffolded modular monoliths.
 * Domain modules add models via their own manifests and condense runs.
 */
export async function buildConsolidatedModels({ repoRoot }) {
  return {
    meta: {
      generatedAt: new Date().toISOString(),
      repositoryRoot: repoRoot,
      condensedBy: "model-condenser",
      description: "Schema inventory for modular-monolith platform modules (_reference, contracts)."
    },
    inventory: [
      {
        id: "ReferenceHealth",
        name: "ReferenceHealth",
        category: "platform",
        sourcePaths: ["backend/src/modules/_reference/schemas/health.schema.js"],
        description: "Example health check response shape from the _reference module.",
        hasSchema: true,
        hasExample: false,
        exampleSourcePath: null
      }
    ],
    definitions: {
      ReferenceHealth: {
        name: "ReferenceHealth",
        category: "platform",
        sourcePaths: ["backend/src/modules/_reference/schemas/health.schema.js"],
        description: "GET /api/_reference/health response fields.",
        schema: { status: "string", module: "string", version: "string" },
        example: null
      }
    },
    exampleInstances: {},
    evalDatasets: {
      description: "Per-module eval fixture paths (health-check shape tests).",
      paths: ["backend/src/modules/_reference/evals/datasets/example.cases.json"]
    }
  };
}

export async function condenseModels({
  repoRoot,
  consolidatedFilesDir,
  modelsDir: modelsDirLegacy,
  consolidatedFileName = "consolidated-models.json",
  writeFile: shouldWrite = true,
  includePayload = false
}) {
  const modelsDir = consolidatedFilesDir ?? modelsDirLegacy;
  const consolidated = await buildConsolidatedModels({ repoRoot });
  const outputPath = join(modelsDir, consolidatedFileName);

  if (shouldWrite) {
    await mkdir(modelsDir, { recursive: true });
    const jsonText = `${JSON.stringify(consolidated, null, 2)}\n`;
    await writeFile(outputPath, jsonText, "utf8");
    const { writeConsolidatedExport } = await import(
      "../../../shared/utils/consolidatedExport.js"
    );
    await writeConsolidatedExport(repoRoot, consolidatedFileName, jsonText, {
      condensedBy: "model-condenser"
    });
  }

  return {
    status: "condensed",
    outputPath,
    outputRelativePath: relative(repoRoot, outputPath),
    modelCount: consolidated.inventory.length,
    exampleInstanceCount: 0,
    generatedAt: consolidated.meta.generatedAt,
    inventory: consolidated.inventory,
    ...(includePayload ? { consolidated } : {})
  };
}

export async function readConsolidatedModels({
  consolidatedFilesDir,
  modelsDir: modelsDirLegacy,
  consolidatedFileName = "consolidated-models.json"
}) {
  const modelsDir = consolidatedFilesDir ?? modelsDirLegacy;
  const outputPath = join(modelsDir, consolidatedFileName);
  const raw = await readFile(outputPath, "utf8");
  return JSON.parse(raw);
}
