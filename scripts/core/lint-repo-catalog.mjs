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

function readJson(rel) {
  return JSON.parse(fs.readFileSync(resolve(rel), "utf8"));
}

function check(predicate, msg) {
  if (!predicate) {
    errors.push(msg);
    exitCode = 1;
  }
}

const requiredMetadataFiles = [
  "metadata/repo.json",
  "metadata/catalog.json",
  "metadata/modules.json",
  "metadata/tasks.json",
  "metadata/contracts.json",
  "metadata/apis.json",
  "metadata/architecture-fitness.json",
  "metadata/dependency-graph.json",
];

for (const file of requiredMetadataFiles) {
  check(exists(file), `Missing metadata file: ${file}`);
  try {
    readJson(file);
  } catch {
    check(false, `Metadata file is not valid JSON: ${file}`);
  }
}

try {
  const catalog = readJson("metadata/catalog.json");
  const catText = JSON.stringify(catalog);

  const expectedGroups = ["repo", "contracts", "tasks", "modules", "apis", "architecture-fitness"];
  for (const group of expectedGroups) {
    check(catText.includes(group), `metadata/catalog.json must include group: ${group}`);
  }

  check(catalog.catalogName === "repo-architecture-catalog", "metadata/catalog.json catalogName must be 'repo-architecture-catalog'");
} catch {
  check(false, "metadata/catalog.json validation failed");
}

try {
  const contracts = readJson("metadata/contracts.json");
  const contractNames = contracts.contracts.map((c) => c.name);
  check(
    contractNames.includes("planningPhase") || JSON.stringify(contracts).includes("planningPhase"),
    "metadata/contracts.json must reference planningPhase contract"
  );
} catch {
  check(false, "metadata/contracts.json must be valid JSON");
}

try {
  const tasks = readJson("metadata/tasks.json");
  const taskText = JSON.stringify(tasks);
  check(
    taskText.includes("repo-architecture-contract"),
    "metadata/tasks.json must reference repo-architecture-contract task"
  );
} catch {
  check(false, "metadata/tasks.json must be valid JSON");
}

const generatedIndexes = [
  "docs/tasks/INDEX.md",
  "scripts/tasks/INDEX.md",
  "work-log/tasks/INDEX.md",
];

for (const idx of generatedIndexes) {
  check(exists(idx), `Generated index must exist: ${idx}`);
  if (exists(idx)) {
    try {
      const content = fs.readFileSync(resolve(idx), "utf8");
      const hasGeneratedWarning = /generated|auto-generated|Do not edit/i.test(content);
      check(hasGeneratedWarning, `${idx} should include generated/auto-generated warning`);

      const referencesMetadata = /metadata/i.test(content);
      check(referencesMetadata, `${idx} should reference metadata`);
    } catch {
      check(false, `${idx} must be readable`);
    }
  }
}

for (const err of errors) {
  console.error(err);
}
process.exit(exitCode);
