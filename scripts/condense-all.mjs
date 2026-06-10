#!/usr/bin/env node
/**
 * Run all consolidated exports into one dated audit folder:
 *   file-exchange/exports/{stamp}_consolidated/
 */
import { spawn } from "node:child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { beginConsolidatedExportSession } from "../backend/src/shared/utils/consolidatedExport.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function runNpm(script) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", script], {
      cwd: repoRoot,
      stdio: "inherit",
      env: { ...process.env }
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code}`));
    });
  });
}

async function main() {
  const session = beginConsolidatedExportSession();
  console.log(`Consolidated export session: ${session.exportDir}/`);

  await runNpm("condense-prompts");
  await runNpm("condense-file-structure");

  await new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", "condense-models", "--", "--local"], {
      cwd: join(repoRoot, "backend"),
      stdio: "inherit",
      env: { ...process.env }
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`condense-models exited with code ${code}`));
    });
  });

  await runNpm("condense-contracts");

  console.log(`Done → ${session.exportDir}/ (latest copies also at file-exchange/exports/consolidated-*.json)`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
