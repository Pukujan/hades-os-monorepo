#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(repoRoot, "docs/architecture/contracts/manifest.json");

const PATH_KEYS = [
  "file",
  "doc",
  "overview",
  "userDoc",
  "timestampHelper",
  "importScript",
  "utility",
  "schema",
  "generator",
  "humanFormat",
  "verify",
  "apiInventory",
  "repoTree",
  "workLogReadme",
  "registry",
  "registryFrontendMirror",
  "parentMiniModulesConfig",
  "lintScript",
  "architectureDoc",
  "promptVersions"
];

if (!existsSync(manifestPath)) {
  console.error("Missing contracts manifest:", manifestPath);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const failures = [];

for (const [key, entry] of Object.entries(manifest)) {
  const paths = PATH_KEYS.map((k) => entry?.[k]).filter(Boolean);
  if (!paths.length) {
    failures.push(`${key}: no documented paths in manifest`);
    continue;
  }
  for (const rel of paths) {
    const abs = join(repoRoot, rel);
    if (!existsSync(abs)) {
      failures.push(`${key}: path not found — ${rel}`);
    }
  }
}

if (failures.length) {
  console.error("Contract lint failed:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(`Contract lint OK (${Object.keys(manifest).length} entries)`);
