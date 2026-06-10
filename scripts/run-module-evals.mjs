#!/usr/bin/env node
import { readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { BACKEND_PARENT_MINI_MODULES } from "./lib/parent-mini-modules.config.mjs";

const targetArg = process.argv[2];
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const modulesDir = join(root, "backend/src/modules");

if (!existsSync(modulesDir)) {
  console.error("No modules directory.");
  process.exit(1);
}

/** @param {string} label
 *  @param {string} runnersDir
 */
function pushEvalTarget(evalTargets, label, runnersDir) {
  if (!existsSync(runnersDir)) return;
  if (evalTargets.some((t) => t.runnersDir === runnersDir)) return;
  evalTargets.push({ label, runnersDir });
}

/** @type {Array<{ label: string, runnersDir: string }>} */
const evalTargets = [];

if (targetArg?.includes("/")) {
  const parts = targetArg.split("/");
  if (parts.length === 2 && BACKEND_PARENT_MINI_MODULES[parts[0]]) {
    pushEvalTarget(
      evalTargets,
      targetArg,
      join(modulesDir, parts[0], parts[1], "evals", "runners")
    );
  } else {
    const [moduleName, agentId] = parts;
    pushEvalTarget(
      evalTargets,
      targetArg,
      join(modulesDir, moduleName, "agents", agentId, "evals", "runners")
    );
  }
} else if (targetArg) {
  pushEvalTarget(
    evalTargets,
    targetArg,
    join(modulesDir, targetArg, "evals", "runners")
  );

  for (const [parentModule, miniModules] of Object.entries(BACKEND_PARENT_MINI_MODULES)) {
    if (!miniModules.includes(targetArg)) continue;
    pushEvalTarget(
      evalTargets,
      `${parentModule}/${targetArg}`,
      join(modulesDir, parentModule, targetArg, "evals", "runners")
    );
  }

  const agentsDir = join(modulesDir, targetArg, "agents");
  if (existsSync(agentsDir)) {
    for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      pushEvalTarget(
        evalTargets,
        `${targetArg}/${entry.name}`,
        join(agentsDir, entry.name, "evals", "runners")
      );
    }
  }
} else {
  for (const entry of readdirSync(modulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    pushEvalTarget(
      evalTargets,
      entry.name,
      join(modulesDir, entry.name, "evals", "runners")
    );

    const miniModules = BACKEND_PARENT_MINI_MODULES[entry.name] ?? [];
    for (const mini of miniModules) {
      pushEvalTarget(
        evalTargets,
        `${entry.name}/${mini}`,
        join(modulesDir, entry.name, mini, "evals", "runners")
      );
    }

    const agentsDir = join(modulesDir, entry.name, "agents");
    if (!existsSync(agentsDir)) continue;
    for (const agentEntry of readdirSync(agentsDir, { withFileTypes: true })) {
      if (!agentEntry.isDirectory()) continue;
      pushEvalTarget(
        evalTargets,
        `${entry.name}/${agentEntry.name}`,
        join(agentsDir, agentEntry.name, "evals", "runners")
      );
    }
  }
}

let failed = false;

for (const target of evalTargets) {
  if (!existsSync(target.runnersDir)) continue;

  const runners = readdirSync(target.runnersDir).filter(
    (f) => f.endsWith(".eval.mjs") || f.endsWith(".eval.js")
  );

  for (const runner of runners) {
    const file = join(target.runnersDir, runner);
    console.log(`\n▶ eval ${target.label}/${runner}`);
    const result = spawnSync(process.execPath, ["--test", file], {
      stdio: "inherit",
      cwd: join(root, "backend")
    });
    if (result.status !== 0) failed = true;
  }
}

if (failed) process.exit(1);
console.log("\nEvals complete.");
