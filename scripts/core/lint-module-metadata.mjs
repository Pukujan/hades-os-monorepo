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

const requiredModuleManifests = [
  { id: "auth", side: "backend", path: "backend/src/modules/auth/module.json" },
  { id: "hades", side: "backend", path: "backend/src/modules/hades/module.json" },
  { id: "model-condenser", side: "backend", path: "backend/src/modules/model-condenser/module.json" },
  { id: "_reference", side: "backend", path: "backend/src/modules/_reference/module.json" },
  { id: "hades", side: "frontend", path: "frontend/src/modules/hades/module.json" },
  { id: "_reference", side: "frontend", path: "frontend/src/modules/_reference/module.json" },
];

const requiredFields = [
  "module", "type", "status", "boundedContext", "side",
  "owns", "dependsOn", "forbiddenDependencies", "apiDocs", "tests",
];

for (const item of requiredModuleManifests) {
  check(exists(item.path), `Missing module manifest: ${item.path}`);

  let manifest;
  try {
    manifest = readJson(item.path);
  } catch {
    check(false, `Module manifest is not valid JSON: ${item.path}`);
    continue;
  }

  for (const field of requiredFields) {
    check(
      Object.prototype.hasOwnProperty.call(manifest, field),
      `${item.path} is missing required field: ${field}`
    );
  }

  check(manifest.module === item.id, `${item.path} module field must be ${item.id}`);
  check(manifest.side === item.side, `${item.path} side field must be ${item.side}`);

  const validTypes = new Set(["product", "platform", "reference"]);
  check(validTypes.has(manifest.type), `${item.path} has invalid type: ${manifest.type}`);

  const validStatuses = new Set(["active", "reference", "planned", "deprecated"]);
  check(validStatuses.has(manifest.status), `${item.path} has invalid status: ${manifest.status}`);

  for (const arrayField of ["owns", "dependsOn", "forbiddenDependencies", "tests"]) {
    check(
      Array.isArray(manifest[arrayField]),
      `${item.path} field ${arrayField} must be an array`
    );
  }

  check(typeof manifest.apiDocs === "string", `${item.path} apiDocs must be a string`);
}

check(exists("metadata/modules.json"), "metadata/modules.json must exist");
try {
  const modulesJson = readJson("metadata/modules.json");
  const text = JSON.stringify(modulesJson);
  for (const item of requiredModuleManifests) {
    check(
      text.includes(item.path),
      `metadata/modules.json must reference manifest path: ${item.path}`
    );
  }
  check(
    !text.includes("pending-module-json"),
    "metadata/modules.json should not have pending tasks for Phase 4 modules"
  );
} catch {
  check(false, "metadata/modules.json must be valid JSON");
}

check(exists("metadata/dependency-graph.json"), "metadata/dependency-graph.json must exist");
try {
  const graph = readJson("metadata/dependency-graph.json");
  check(Array.isArray(graph.nodes), "dependency-graph.json must include nodes array");
} catch {
  check(false, "metadata/dependency-graph.json must be valid JSON");
}

check(exists("metadata/catalog.json"), "metadata/catalog.json must exist");
try {
  const catalog = readJson("metadata/catalog.json");
  const text = JSON.stringify(catalog);
  for (const item of requiredModuleManifests) {
    check(text.includes(item.id), `metadata/catalog.json should include module: ${item.id}`);
  }
  check(text.includes("modules"), "metadata/catalog.json must include modules catalog group");
} catch {
  check(false, "metadata/catalog.json must be valid JSON");
}

for (const err of errors) {
  console.error(err);
}
process.exit(exitCode);
