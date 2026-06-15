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

check(exists("metadata/architecture-fitness.json"), "Missing metadata/architecture-fitness.json");

let fitness;
try {
  fitness = readJson("metadata/architecture-fitness.json");
} catch {
  check(false, "metadata/architecture-fitness.json is not valid JSON");
  process.exit(1);
}

check(
  Array.isArray(fitness.implementedChecks),
  "metadata/architecture-fitness.json must have an implementedChecks array"
);

check(
  Array.isArray(fitness.deferredChecks),
  "metadata/architecture-fitness.json must have a deferredChecks array"
);

const requiredImplIds = [
  "doc-canonical-source",
  "task-artifacts",
  "module-metadata",
  "repo-catalog",
  "dependency-graph",
];

const implIds = (fitness.implementedChecks ?? []).map((c) => c.id);

for (const requiredId of requiredImplIds) {
  check(
    implIds.includes(requiredId),
    `metadata/architecture-fitness.json implementedChecks must include "${requiredId}"`
  );
}

const fitnessText = JSON.stringify(fitness);
check(
  fitnessText.includes("deferred"),
  "metadata/architecture-fitness.json must reference deferred checks"
);

const pkgText = fs.readFileSync(resolve("package.json"), "utf8");
let pkg;
try {
  pkg = JSON.parse(pkgText);
} catch {
  check(false, "package.json is not valid JSON");
  process.exit(1);
}

const scripts = pkg.scripts ?? {};

for (const impl of fitness.implementedChecks ?? []) {
  if (impl.script && impl.script !== "lint:architecture-fitness") {
    check(
      scripts[impl.script] !== undefined,
      `package.json must define script "${impl.script}" for implemented check "${impl.id}"`
    );
  }
}

const apiDocsExclusion = (fitness.exclusions ?? []).find(
  (e) => e.id && e.id.endsWith("api-docs")
);
check(
  apiDocsExclusion !== undefined || !fitnessText.includes("api-docs"),
  "architecture-fitness.json must exclude the api-docs lint if referenced"
);

check(exists("metadata/dependency-graph.json"), "Missing metadata/dependency-graph.json");

let graph;
try {
  graph = readJson("metadata/dependency-graph.json");
} catch {
  check(false, "metadata/dependency-graph.json is not valid JSON");
  process.exit(1);
}

const depNodes = graph.nodes ?? graph.modules ?? [];
const depEdges = graph.edges ?? graph.dependencies ?? [];

check(Array.isArray(depNodes), "dependency-graph.json must have nodes/modules array");
check(Array.isArray(depEdges), "dependency-graph.json must have edges/dependencies array");

const adjacency = new Map();

for (const node of depNodes) {
  const id = typeof node === "string" ? node : node.id;
  if (id) adjacency.set(id, []);
}

for (const edge of depEdges) {
  const from = edge.from ?? edge.source;
  const to = edge.to ?? edge.target;
  if (!from || !to) continue;
  if (!adjacency.has(from)) adjacency.set(from, []);
  if (!adjacency.has(to)) adjacency.set(to, []);
  adjacency.get(from).push(to);
}

const visiting = new Set();
const visited = new Set();
let cycleFound = null;

function visit(node) {
  if (visiting.has(node)) {
    cycleFound = node;
    return false;
  }
  if (visited.has(node)) return true;
  visiting.add(node);
  for (const next of adjacency.get(node) ?? []) {
    if (!visit(next)) return false;
  }
  visiting.delete(node);
  visited.add(node);
  return true;
}

for (const node of adjacency.keys()) {
  if (!visit(node)) break;
}

check(
  cycleFound === null,
  cycleFound ? `Dependency graph contains a cycle involving node: ${cycleFound}` : true
);

for (const err of errors) {
  console.error(err);
}
process.exit(exitCode);
