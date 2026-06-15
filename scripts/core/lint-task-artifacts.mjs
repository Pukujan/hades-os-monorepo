#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let exitCode = 0;
const errors = [];

function resolve(rel) {
  return path.join(root, rel);
}

function exists(rel) {
  return fs.existsSync(resolve(rel));
}

function check(predicate, msg) {
  if (!predicate) {
    errors.push(msg);
    exitCode = 1;
  }
}

const taskName = "repo-architecture-contract";
const taskDirs = [
  `docs/tasks/${taskName}`,
  `scripts/tasks/${taskName}`,
  `work-log/tasks/${taskName}`,
];

for (const dir of taskDirs) {
  check(exists(dir), `Task root directory must exist: ${dir}`);
}

check(exists("docs/tasks/INDEX.md"), "docs/tasks/INDEX.md must exist");
check(exists("scripts/tasks/INDEX.md"), "scripts/tasks/INDEX.md must exist");
check(exists("work-log/tasks/INDEX.md"), "work-log/tasks/INDEX.md must exist");

check(exists("scripts/tasks/repo-architecture-contract/metadata.json"), "scripts/tasks/repo-architecture-contract/metadata.json required");
check(exists("work-log/tasks/repo-architecture-contract/metadata.json"), "work-log/tasks/repo-architecture-contract/metadata.json required");

const metadataDirs = [
  "scripts/tasks/repo-architecture-contract",
  "work-log/tasks/repo-architecture-contract",
];

for (const dir of metadataDirs) {
  check(exists(`${dir}/metadata.json`), `metadata.json required: ${dir}/metadata.json`);
}

const phasesDirs = [
  "scripts/tasks/repo-architecture-contract/phases",
  "work-log/tasks/repo-architecture-contract/phases",
];

for (const dir of phasesDirs) {
  if (exists(dir)) {
    let entries;
    try {
      entries = fs.readdirSync(resolve(dir), { withFileTypes: true });
    } catch {
      check(false, `Cannot read phases directory: ${dir}`);
      continue;
    }
    const phaseDirs = entries.filter((e) => e.isDirectory());
    for (const phase of phaseDirs) {
      const metaPath = `${dir}/${phase.name}/metadata.json`;
      if (!exists(metaPath)) {
        errors.push(`Missing metadata.json for phase ${phase.name} in ${dir}`);
        exitCode = 1;
      }
    }
  }
}

check(exists("work-log/tasks/repo-architecture-contract/handoffs"), "work-log/tasks/repo-architecture-contract/handoffs must exist");
check(exists("work-log/tasks/repo-architecture-contract/sessions"), "work-log/tasks/repo-architecture-contract/sessions must exist");
check(exists("work-log/tasks/repo-architecture-contract/dev-logs"), "work-log/tasks/repo-architecture-contract/dev-logs must exist");

for (const err of errors) {
  console.error(err);
}
process.exit(exitCode);
