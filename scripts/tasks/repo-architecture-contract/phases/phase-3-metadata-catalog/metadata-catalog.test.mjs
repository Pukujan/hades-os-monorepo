import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "metadata/repo.json",
  "metadata/catalog.json",
  "metadata/modules.json",
  "metadata/tasks.json",
  "metadata/contracts.json",
  "metadata/apis.json",
  "metadata/architecture-fitness.json",
  "metadata/dependency-graph.json"
];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

test("all 8 metadata catalog files exist", () => {
  for (const file of requiredFiles) {
    assert.ok(exists(file), `Missing metadata file: ${file}`);
  }
});

test("each metadata file is valid JSON with a top-level object or array", () => {
  for (const file of requiredFiles) {
    const data = readJson(file);
    assert.ok(
      data !== null && (typeof data === "object" || Array.isArray(data)),
      `Invalid top-level type in ${file}`
    );
  }
});

test("metadata/repo.json has required repo-level fields", () => {
  const repo = readJson("metadata/repo.json");
  assert.equal(typeof repo.name, "string", "repo.json: missing or invalid 'name'");
  assert.equal(typeof repo.description, "string", "repo.json: missing or invalid 'description'");
});

test("metadata/catalog.json has required catalog fields", () => {
  const catalog = readJson("metadata/catalog.json");
  assert.equal(typeof catalog.catalogName, "string", "catalog.json: missing or invalid 'catalogName'");
  assert.ok(Array.isArray(catalog.files), "catalog.json: missing or invalid 'files' array");
});

test("metadata/modules.json has module inventory", () => {
  const modules = readJson("metadata/modules.json");
  assert.ok(Array.isArray(modules.modules), "modules.json: missing or invalid 'modules' array");
  for (const mod of modules.modules) {
    assert.equal(typeof mod.name, "string", "modules.json: module missing 'name'");
    assert.equal(typeof mod.path, "string", "modules.json: module missing 'path'");
  }
});

test("metadata/tasks.json has task inventory", () => {
  const tasks = readJson("metadata/tasks.json");
  assert.ok(Array.isArray(tasks.tasks), "tasks.json: missing or invalid 'tasks' array");
  for (const task of tasks.tasks) {
    assert.equal(typeof task.name, "string", "tasks.json: task missing 'name'");
    assert.equal(typeof task.path, "string", "tasks.json: task missing 'path'");
  }
});

test("metadata/contracts.json has contract registry", () => {
  const contracts = readJson("metadata/contracts.json");
  assert.ok(Array.isArray(contracts.contracts), "contracts.json: missing or invalid 'contracts' array");
  for (const c of contracts.contracts) {
    assert.equal(typeof c.name, "string", "contracts.json: contract missing 'name'");
  }
});

test("metadata/apis.json has API registry", () => {
  const apis = readJson("metadata/apis.json");
  assert.ok(Array.isArray(apis.apis), "apis.json: missing or invalid 'apis' array");
  for (const api of apis.apis) {
    assert.equal(typeof api.name, "string", "apis.json: API entry missing 'name'");
  }
});

test("metadata/architecture-fitness.json has fitness function registry", () => {
  const fitness = readJson("metadata/architecture-fitness.json");
  const checks = fitness.implementedChecks ?? fitness.fitnessFunctions;
  assert.ok(Array.isArray(checks), "architecture-fitness.json: missing or invalid 'implementedChecks'/'fitnessFunctions' array");
  for (const fn of checks) {
    assert.ok(typeof (fn.id ?? fn.name) === "string", "architecture-fitness.json: entry missing 'id' or 'name'");
  }
  assert.ok(Array.isArray(fitness.deferredChecks), "architecture-fitness.json: missing 'deferredChecks' array");
});

test("metadata/dependency-graph.json has dependency graph", () => {
  const graph = readJson("metadata/dependency-graph.json");
  assert.ok(Array.isArray(graph.modules), "dependency-graph.json: missing or invalid 'modules' array");
  assert.ok(Array.isArray(graph.dependencies), "dependency-graph.json: missing or invalid 'dependencies' array");
});
