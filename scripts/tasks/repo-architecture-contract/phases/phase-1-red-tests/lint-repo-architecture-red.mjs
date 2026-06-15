#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");

const findings = [];

function check(condition, msg) {
  if (!condition) {
    findings.push(msg);
  }
}

// 1. Future metadata files
const metadataFiles = [
  "metadata/repo.json",
  "metadata/catalog.json",
  "metadata/modules.json",
  "metadata/tasks.json",
  "metadata/contracts.json",
  "metadata/apis.json",
  "metadata/architecture-fitness.json",
  "metadata/dependency-graph.json",
];

for (const f of metadataFiles) {
  const abs = join(repoRoot, f);
  if (!existsSync(abs)) {
    findings.push(`RED (future): Missing metadata file: ${f}`);
  }
}

// 2. Future module manifests
const moduleManifests = [
  "backend/src/modules/auth/module.json",
  "backend/src/modules/hades/module.json",
  "backend/src/modules/model-condenser/module.json",
  "backend/src/modules/_reference/module.json",
  "frontend/src/modules/hades/module.json",
  "frontend/src/modules/_reference/module.json",
];

for (const f of moduleManifests) {
  const abs = join(repoRoot, f);
  if (!existsSync(abs)) {
    findings.push(`RED (future): Missing module manifest: ${f}`);
  }
}

// 3. Future generated indexes
const indexFiles = [
  "docs/INDEX.md",
  "docs/modules/INDEX.md",
  "docs/tasks/INDEX.md",
  "scripts/tasks/INDEX.md",
  "work-log/tasks/INDEX.md",
];

for (const f of indexFiles) {
  const abs = join(repoRoot, f);
  if (!existsSync(abs)) {
    findings.push(`RED (future): Missing generated index: ${f}`);
  }
}

// 4. Future contract docs
const contractDocs = [
  "docs/architecture/contracts/docCanonicalSource.contract.md",
  "docs/architecture/contracts/taskArtifactLayout.contract.md",
  "docs/architecture/contracts/moduleMetadata.contract.md",
  "docs/architecture/contracts/modulePublicApi.contract.md",
  "docs/architecture/contracts/repoCatalog.contract.md",
  "docs/architecture/contracts/routeManifest.contract.md",
  "docs/architecture/contracts/architectureFitness.contract.md",
  "docs/architecture/contracts/adrLifecycle.contract.md",
];

for (const f of contractDocs) {
  const abs = join(repoRoot, f);
  if (!existsSync(abs)) {
    findings.push(`RED (future): Missing contract doc: ${f}`);
  }
}

// 5. Duplicate authored docs risk
function listMds(dir) {
  const results = [];
  const visit = (d) => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "node_modules") continue;
      const full = join(d, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name.endsWith(".md")) results.push(full);
    }
  };
  visit(dir);
  return results;
}

const docsMds = listMds(join(repoRoot, "docs"));
const additionalDocsMds = listMds(join(repoRoot, "additional-modules/docs"));

const docsBasenames = new Set(docsMds.map((f) => f.split("/").pop()));
const duplicates = additionalDocsMds.filter((f) => docsBasenames.has(f.split("/").pop()));

if (duplicates.length > 0) {
  for (const f of duplicates) {
    findings.push(`INFO (duplicate risk): ${relative(repoRoot, f)} shares basename with a file in docs/`);
  }
}

if (findings.length) {
  console.error("repo-architecture red/audit findings:\n");
  for (const f of findings) {
    console.error(`  - ${f}`);
  }
  console.error(`\n${findings.length} finding(s). These are expected red state until later phases.`);
  process.exit(0);
}

console.log("repo-architecture red/audit: no findings (all target artifacts already exist)");
