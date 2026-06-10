import { access } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { normalizeExchangeStamp } from "../backend/src/shared/utils/formatExchangeTimestamp.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Resolve imports/{stamp}/ — accepts human or legacy compact stamps.
 * @param {string} [stamp]
 * @returns {Promise<string>} resolved stamp folder name under imports/
 */
export async function resolveImportStamp(stamp) {
  const candidates = [];
  if (stamp) {
    candidates.push(stamp, normalizeExchangeStamp(stamp));
  }
  const importsRoot = join(repoRoot, "file-exchange/imports");
  const { readdir } = await import("fs/promises");
  let dirs = [];
  try {
    dirs = await readdir(importsRoot);
  } catch {
    dirs = [];
  }
  if (!stamp && dirs.length) {
    dirs.sort();
    candidates.push(dirs[dirs.length - 1]);
  }
  const seen = new Set();
  for (const c of candidates) {
    if (!c || seen.has(c)) continue;
    seen.add(c);
    try {
      await access(join(importsRoot, c));
      return c;
    } catch {
      /* try next */
    }
  }
  throw new Error(
    stamp
      ? `No import folder for stamp: ${stamp}`
      : "No file-exchange/imports/{stamp}/ folder found"
  );
}

export function importDirForStamp(stamp) {
  return join(repoRoot, "file-exchange/imports", stamp);
}
