/**
 * Paths under starter export sources that changed in git (product repo).
 */

const STARTER_PREFIXES = [
  "file-exchange/exports/templates/",
  "scripts/export-architecture-starter.mjs",
  "docs/architecture/contracts/manifest.json",
  "docs/architecture/contracts/architecturePushDevLog.contract.md",
  "docs/architecture/contracts/planningPhase.contract.md",
  "docs/architecture/contracts/prePushDevLog.contract.md",
  "backend/src/shared/contracts/"
];

export function filterStarterPaths(changedFiles) {
  const paths = [];
  for (const { path } of changedFiles) {
    if (STARTER_PREFIXES.some((p) => path === p || path.startsWith(p))) {
      paths.push(path);
    }
  }
  return [...new Set(paths)].sort();
}

export function classifyChangedFiles(changedFiles) {
  const added = [];
  const modified = [];
  const deleted = [];
  for (const { code, path } of changedFiles) {
    if (code.includes("A") || code === "??") added.push(path);
    else if (code.includes("D")) deleted.push(path);
    else modified.push(path);
  }
  return { added, modified, deleted };
}
