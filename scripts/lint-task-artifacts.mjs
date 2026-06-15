#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const SCRIPTS_TASKS = join(repoRoot, "scripts/tasks");
const WORKLOG_TASKS = join(repoRoot, "work-log/tasks");
const LEGACY_REGISTRY = join(repoRoot, "work-log/legacy-registry.json");

const LEGACY_DIRS = [
  "work-log/handoffs",
  "work-log/planning",
  "work-log/dev-logs/agent",
  "work-log/dev-logs/human",
  "work-log/sessions",
];

function collectFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  const visit = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") visit(full);
      } else {
        files.push(full);
      }
    }
  };
  visit(dir);
  return files;
}

function relPath(abs) {
  return relative(repoRoot, abs);
}

function taskDirs(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "node_modules")
    .map((e) => join(root, e.name));
}

export function lintTaskArtifacts() {
  const failures = [];

  // 1. scripts/tasks/task-artifact-layout/ must exist
  const layoutRoot = join(SCRIPTS_TASKS, "task-artifact-layout");
  if (!existsSync(layoutRoot)) {
    failures.push("scripts/tasks/task-artifact-layout/ dir does not exist");
  }

  // 2. Each task under scripts/tasks/ must have metadata.json
  for (const taskDir of taskDirs(SCRIPTS_TASKS)) {
    const meta = join(taskDir, "metadata.json");
    if (!existsSync(meta)) {
      failures.push(`scripts/tasks/${basename(taskDir)}/metadata.json missing`);
    }

    // 3. Each phase must have metadata.json
    const phasesDir = join(taskDir, "phases");
    if (existsSync(phasesDir)) {
      for (const phaseEntry of readdirSync(phasesDir, { withFileTypes: true })) {
        if (!phaseEntry.isDirectory()) continue;
        const phaseMeta = join(phasesDir, phaseEntry.name, "metadata.json");
        if (!existsSync(phaseMeta)) {
          failures.push(`scripts/tasks/${basename(taskDir)}/phases/${phaseEntry.name}/metadata.json missing`);
        }
      }
    }
  }

  // 4. work-log/tasks/ must exist
  if (!existsSync(WORKLOG_TASKS)) {
    failures.push("work-log/tasks/ dir does not exist");
  } else {
    // 5. work-log/tasks/README.md must exist
    if (!existsSync(join(WORKLOG_TASKS, "README.md"))) {
      failures.push("work-log/tasks/README.md missing");
    }

    // 6. work-log/tasks/INDEX.md must exist
    if (!existsSync(join(WORKLOG_TASKS, "INDEX.md"))) {
      failures.push("work-log/tasks/INDEX.md missing");
    }

    // 7. Each task under work-log/tasks/ must have metadata.json
    for (const taskDir of taskDirs(WORKLOG_TASKS)) {
      const meta = join(taskDir, "metadata.json");
      if (!existsSync(meta)) {
        failures.push(`work-log/tasks/${basename(taskDir)}/metadata.json missing`);
      }

      // 8. Each phase must have metadata.json
      const phasesDir = join(taskDir, "phases");
      if (existsSync(phasesDir)) {
        for (const phaseEntry of readdirSync(phasesDir, { withFileTypes: true })) {
          if (!phaseEntry.isDirectory()) continue;
          const phaseMeta = join(phasesDir, phaseEntry.name, "metadata.json");
          if (!existsSync(phaseMeta)) {
            failures.push(`work-log/tasks/${basename(taskDir)}/phases/${phaseEntry.name}/metadata.json missing`);
          }
        }
      }

      // 9. Each task with handoffFolder in metadata must have mirror under work-log/tasks/<task>/handoffs/
      if (existsSync(meta)) {
        try {
          const metaContent = JSON.parse(readFileSync(meta, "utf8"));
          if (metaContent.handoffFolder) {
            const handoffMirrorDir = join(taskDir, "handoffs");
            if (!existsSync(handoffMirrorDir)) {
              failures.push(`work-log/tasks/${basename(taskDir)}/handoffs/ missing (handoffFolder: ${metaContent.handoffFolder})`);
            }
          }
        } catch {
          failures.push(`work-log/tasks/${basename(taskDir)}/metadata.json is not valid JSON`);
        }
      }
    }
  }

  // 10. work-log/legacy-registry.json must exist
  if (!existsSync(LEGACY_REGISTRY)) {
    failures.push("work-log/legacy-registry.json does not exist");
  } else {
    // 11. All legacy files must be registered
    try {
      const registry = JSON.parse(readFileSync(LEGACY_REGISTRY, "utf8"));
      const registeredFiles = new Set(
        (registry.entries || []).map((e) => e.file),
      );

      for (const legacyDir of LEGACY_DIRS) {
        const absDir = join(repoRoot, legacyDir);
        if (!existsSync(absDir)) continue;
        for (const file of collectFiles(absDir)) {
          const rel = relPath(file);
          if (!registeredFiles.has(rel)) {
            failures.push(`legacy file not registered: ${rel}`);
          }
        }
      }
    } catch {
      failures.push("work-log/legacy-registry.json is not valid JSON");
    }
  }

  return failures;
}

function main() {
  const failures = lintTaskArtifacts();
  if (failures.length) {
    console.error("Task artifact lint failed:\n" + failures.map((f) => `  - ${f}`).join("\n"));
    process.exit(1);
  }
  console.log("Task artifact lint OK");
}

main();
