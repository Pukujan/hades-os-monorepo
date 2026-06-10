#!/usr/bin/env node
import { mkdirSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import {
  getBackendFiles,
  getFrontendFiles,
  getModuleApiDocContent,
  toTitleCase
} from "./lib/module-scaffold.mjs";

const [name, ...rest] = process.argv.slice(2);
if (!name) {
  console.error(
    'Usage: node scripts/new-module.mjs <module-name> [--label "Module Label"]'
  );
  process.exit(1);
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
  console.error("Module name must be kebab-case (example: intake-triage)");
  process.exit(1);
}

const labelFlagIndex = rest.indexOf("--label");
const label =
  labelFlagIndex >= 0 && rest[labelFlagIndex + 1]
    ? rest[labelFlagIndex + 1]
    : toTitleCase(name);

const root = new URL("../", import.meta.url).pathname;
const backendDir = join(root, "backend/src/modules", name);
const frontendDir = join(root, "frontend/src/modules", name);

if (existsSync(backendDir) || existsSync(frontendDir)) {
  console.error(`Module already exists: ${name}`);
  process.exit(1);
}

function writeTree(baseDir, files) {
  mkdirSync(baseDir, { recursive: true });
  for (const { rel, content } of files) {
    const target = join(baseDir, rel);
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, content, "utf8");
  }
}

writeTree(backendDir, getBackendFiles(name));
writeTree(frontendDir, getFrontendFiles(name, label));

const docsDir = join(root, "docs", name);
mkdirSync(docsDir, { recursive: true });
writeFileSync(join(docsDir, "API.md"), getModuleApiDocContent(name, label), "utf8");

console.log(`Created module: ${name}`);
console.log(`  backend/src/modules/${name}/`);
console.log(`  frontend/src/modules/${name}/`);
console.log(`  docs/${name}/API.md`);
console.log("");
console.log("Next:");
console.log(`  Add rows to docs/API.md (Module index + Endpoint registry) for /api/${name}`);
console.log("  npm run lint:architecture");
console.log(`  npm test`);
console.log(`  npm run test:evals -- ${name}`);
console.log("  Restart backend and refresh frontend");
