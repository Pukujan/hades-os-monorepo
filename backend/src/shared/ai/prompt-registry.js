import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

/**
 * Load a versioned prompt template from a module's prompts/ folder.
 * @param {string} moduleDir - absolute path to backend/src/modules/<name>
 * @param {string} promptId - id matching prompts/templates and manifest
 */
export async function loadPromptTemplate(moduleDir, promptId) {
  const manifestPath = join(moduleDir, "prompts", "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`Prompt manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entry = manifest.prompts?.find((p) => p.id === promptId);
  if (!entry?.file) {
    throw new Error(`Prompt id not in manifest: ${promptId}`);
  }

  const filePath = join(moduleDir, "prompts", entry.file);
  const mod = await import(pathToFileURL(filePath).href);
  return {
    id: mod.id ?? promptId,
    version: mod.version ?? entry.version ?? "0.0.0",
    template: mod.template,
    variables: mod.variables ?? entry.variables ?? []
  };
}

export function renderPrompt(template, variables = {}) {
  let output = template;
  for (const [key, value] of Object.entries(variables)) {
    output = output.replaceAll(`{{${key}}}`, String(value ?? ""));
  }
  return output;
}

export function moduleDirFromMeta(metaUrl) {
  return dirname(fileURLToPath(metaUrl));
}
