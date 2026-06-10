#!/usr/bin/env node
/**
 * Copy an inbound bundle into file-exchange/imports/{UTC-stamp}/
 * Usage: node scripts/import-to-file-exchange.mjs /path/to/bundle [optional-stamp]
 */
import { cp, mkdir, access, rm } from "fs/promises";
import { join, basename, dirname, resolve, isAbsolute, relative } from "path";
import { fileURLToPath } from "url";
import { formatExchangeTimestamp } from "../backend/src/shared/utils/formatExchangeTimestamp.js";
import { resolveArtifactPaths } from "../backend/src/shared/config/resolveArtifactPaths.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** @param {string} child @param {string} root */
function isInside(child, root) {
  const rel = relative(resolve(root), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/** Remove inbound bundle from repo root after import (file-exchange contract). */
function shouldRemoveSourceAfterImport(absSource, importsRoot) {
  if (!isInside(absSource, repoRoot)) return false;
  if (isInside(absSource, importsRoot)) return false;
  if (isInside(absSource, join(repoRoot, "file-exchange/exports"))) return false;
  return true;
}

async function main() {
  const source = process.argv[2];
  if (!source) {
    console.error("Usage: node scripts/import-to-file-exchange.mjs <sourceDirOrZipParent> [UTC-stamp]");
    process.exit(1);
  }

  const stamp = process.argv[3] || formatExchangeTimestamp();
  const { fileExchangeImports } = resolveArtifactPaths(repoRoot);
  const dest = join(fileExchangeImports, stamp);
  const absSource = isAbsolute(source) ? resolve(source) : resolve(process.cwd(), source);

  try {
    await access(absSource);
  } catch {
    console.error("Source not found:", absSource);
    process.exit(1);
  }

  await mkdir(dest, { recursive: true });
  const folderName = basename(absSource);
  const target = join(dest, folderName);
  await cp(absSource, target, { recursive: true });

  console.log(`Imported → ${dest}/${folderName}`);
  console.log(`Stamp: ${stamp} — use for ingest scripts or paths under this import folder.`);

  if (shouldRemoveSourceAfterImport(absSource, fileExchangeImports)) {
    await rm(absSource, { recursive: true, force: true });
    console.log(`Removed source from repo (contract): ${absSource}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
