#!/usr/bin/env node
/**
 * Write consolidated-file-structure.json — ASCII tree only (no nested JSON tree).
 * Excludes node_modules, .git, dist, build, and runtime batch/export roots.
 *
 * Usage: node scripts/condense-file-structure.mjs
 */
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { writeConsolidatedArtifact } from "./consolidated-output.mjs";
import {
  buildRepoTree,
  TREE_IGNORE_DIRS,
  TREE_IGNORE_FILES,
  TREE_IGNORE_PREFIXES
} from "./lib/repo-tree.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const { rootName, treeText, stats } = await buildRepoTree(repoRoot);

  const doc = {
    meta: {
      generatedAt: new Date().toISOString(),
      repositoryRoot: repoRoot,
      rootName,
      condensedBy: "condense-file-structure",
      description:
        "ASCII repository tree (tree(1)-style). Excludes node_modules, .git, dist, build, and runtime data/ (if present).",
      excludeDirs: TREE_IGNORE_DIRS,
      excludeFiles: TREE_IGNORE_FILES,
      excludePrefixes: TREE_IGNORE_PREFIXES,
      treeIgnoreFlag: 'tree -I "node_modules|.git|dist|build"'
    },
    stats,
    treeText
  };

  const { exportPath, datedExportDir, mirrorPath } = await writeConsolidatedArtifact(
    "fileStructure",
    doc
  );
  const lineCount = treeText.split("\n").length;
  console.log(
    `Consolidated tree (${lineCount} lines, ${stats.fileCount} files) → ${exportPath} (${datedExportDir}/, mirror ${mirrorPath})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
