import { readdir, rm, stat } from "fs/promises";
import { join } from "path";
import { resolveArtifactPaths } from "../config/resolveArtifactPaths.js";
import { AppError } from "../http/errors.js";

export const FILE_EXCHANGE_DIR = "file-exchange";
export const IMPORTS_SUBDIR = "imports";
export const EXPORTS_SUBDIR = "exports";

/** Latest handoff files at exports root (consolidatedExports contract). */
export const CONSOLIDATED_LATEST_FILENAMES = new Set([
  "consolidated-models.json",
  "consolidated-prompts.json",
  "consolidated-file-structure.json"
]);

const VALID_SCOPES = new Set(["all", "imports", "exports"]);

/**
 * @param {string} dir
 * @param {{ preserveNames: Set<string>, dryRun: boolean, pathPrefix: string, removed: string[], skipped: string[] }} ctx
 */
async function clearDirectoryChildren(dir, ctx) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  for (const entry of entries) {
    const name = entry.name;
    const relPath = `${ctx.pathPrefix}${name}`;
    if (ctx.preserveNames.has(name)) {
      ctx.skipped.push(relPath);
      continue;
    }

    const abs = join(dir, name);
    if (!ctx.dryRun) {
      await rm(abs, { recursive: true, force: true });
    }
    ctx.removed.push(relPath);
  }
}

/**
 * @param {string} exportsDir
 * @param {{ keepLatestConsolidated: boolean, keepTemplates: boolean, dryRun: boolean, removed: string[], skipped: string[] }} options
 */
async function clearExportsDir(exportsDir, options) {
  const preserve = new Set([".gitkeep"]);
  if (options.keepTemplates) {
    preserve.add("templates");
  }

  let entries;
  try {
    entries = await readdir(exportsDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  for (const entry of entries) {
    const name = entry.name;
    const relPath = `exports/${name}`;
    if (preserve.has(name)) {
      options.skipped.push(relPath);
      continue;
    }

    if (
      options.keepLatestConsolidated &&
      entry.isFile() &&
      CONSOLIDATED_LATEST_FILENAMES.has(name)
    ) {
      options.skipped.push(relPath);
      continue;
    }

    const abs = join(exportsDir, name);
    if (!options.dryRun) {
      await rm(abs, { recursive: true, force: true });
    }
    options.removed.push(relPath);
  }
}

/**
 * Remove dated import/export session folders and optional export clutter.
 * Does not touch consolidated-files/ mirror or runtime batch data.
 *
 * @param {{
 *   repoRoot: string,
 *   scope?: "all" | "imports" | "exports",
 *   confirm?: boolean,
 *   dryRun?: boolean,
 *   keepLatestConsolidated?: boolean,
 *   keepTemplates?: boolean
 * }} options
 */
export async function clearFileExchange({
  repoRoot,
  scope = "all",
  confirm = false,
  dryRun = false,
  keepLatestConsolidated = true,
  keepTemplates = true
}) {
  if (!VALID_SCOPES.has(scope)) {
    throw new AppError(`scope must be one of: ${[...VALID_SCOPES].join(", ")}`, 400);
  }

  if (!confirm && !dryRun) {
    throw new AppError(
      "Clear requires confirm: true in the request body, or dryRun: true to preview",
      400
    );
  }

  const { fileExchange } = resolveArtifactPaths(repoRoot);
  const exchangeRoot = fileExchange;
  try {
    const st = await stat(exchangeRoot);
    if (!st.isDirectory()) {
      throw new AppError(`${FILE_EXCHANGE_DIR}/ is not a directory`, 500);
    }
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new AppError(`${FILE_EXCHANGE_DIR}/ not found`, 404);
    }
    throw error;
  }

  const removed = [];
  const skipped = [];

  if (scope === "all" || scope === "imports") {
    await clearDirectoryChildren(join(exchangeRoot, IMPORTS_SUBDIR), {
      preserveNames: new Set([".gitkeep"]),
      dryRun,
      pathPrefix: "imports/",
      removed,
      skipped
    });
  }

  if (scope === "all" || scope === "exports") {
    await clearExportsDir(join(exchangeRoot, EXPORTS_SUBDIR), {
      keepLatestConsolidated,
      keepTemplates,
      dryRun,
      removed,
      skipped
    });
  }

  return {
    status: dryRun ? "preview" : "cleared",
    scope,
    dryRun,
    cleared: !dryRun,
    keepLatestConsolidated: scope === "imports" ? null : keepLatestConsolidated,
    keepTemplates: scope === "imports" ? null : keepTemplates,
    removed,
    removedCount: removed.length,
    skipped,
    note: dryRun
      ? "No files removed. Set confirm: true to clear."
      : "Dated import/export folders removed. Latest consolidated-*.json at exports/ may be kept when keepLatestConsolidated is true."
  };
}
