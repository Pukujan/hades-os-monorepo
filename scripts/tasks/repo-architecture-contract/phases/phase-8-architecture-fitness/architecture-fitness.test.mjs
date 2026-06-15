import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();

function full(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(full(relativePath));
}

function read(relativePath) {
  return fs.readFileSync(full(relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function runNpm(script) {
  return execFileSync("npm", ["run", script], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

test("architecture fitness lint script exists", () => {
  assert.ok(
    exists("scripts/core/lint-architecture-fitness.mjs"),
    "Missing scripts/core/lint-architecture-fitness.mjs"
  );
});

test("package scripts register architecture fitness lint", () => {
  const pkg = readJson("package.json");

  assert.ok(
    pkg.scripts?.["lint:architecture-fitness"],
    "package.json missing lint:architecture-fitness"
  );

  assert.ok(
    pkg.scripts["lint:architecture-fitness"].includes("scripts/core/lint-architecture-fitness.mjs"),
    "lint:architecture-fitness must run scripts/core/lint-architecture-fitness.mjs"
  );

  assert.ok(
    pkg.scripts?.["lint:repo-architecture"],
    "package.json missing lint:repo-architecture"
  );

  assert.ok(
    pkg.scripts["lint:repo-architecture"].includes("lint:architecture-fitness"),
    "lint:repo-architecture must include lint:architecture-fitness"
  );
});

test("architecture fitness metadata lists implemented and deferred checks", () => {
  const fitness = readJson("metadata/architecture-fitness.json");
  const text = JSON.stringify(fitness);

  const requiredImplementedChecks = [
    "doc-canonical-source",
    "task-artifacts",
    "module-metadata",
    "repo-catalog",
    "dependency-graph"
  ];

  for (const check of requiredImplementedChecks) {
    assert.ok(
      text.includes(check),
      `metadata/architecture-fitness.json must include implemented check: ${check}`
    );
  }

  assert.ok(
    text.includes("Phase 9") || text.includes("phase-9") || text.includes("deferred"),
    "metadata/architecture-fitness.json must mark route/API docs cleanup as deferred to Phase 9"
  );

  assert.ok(
    text.includes("route") || text.includes("api"),
    "metadata/architecture-fitness.json must mention route/API docs as deferred"
  );
});

test("architecture fitness lint does not call lint:api-docs", () => {
  const script = read("scripts/core/lint-architecture-fitness.mjs");
  const pkg = readJson("package.json");

  assert.ok(
    !script.includes("lint:api-docs"),
    "lint-architecture-fitness.mjs must not call lint:api-docs in Phase 8"
  );

  assert.ok(
    !pkg.scripts["lint:architecture-fitness"].includes("lint:api-docs"),
    "lint:architecture-fitness must not call lint:api-docs in Phase 8"
  );
});

test("dependency graph has no cycles", () => {
  const graph = readJson("metadata/dependency-graph.json");

  const nodes = graph.nodes ?? graph.modules ?? [];
  const edges = graph.edges ?? graph.dependencies ?? [];

  assert.ok(Array.isArray(nodes), "dependency graph must include nodes/modules array");
  assert.ok(Array.isArray(edges), "dependency graph must include edges/dependencies array");

  const adjacency = new Map();

  for (const node of nodes) {
    const id = typeof node === "string" ? node : node.id;
    if (id) adjacency.set(id, []);
  }

  for (const edge of edges) {
    const from = edge.from ?? edge.source;
    const to = edge.to ?? edge.target;

    if (!from || !to) continue;

    if (!adjacency.has(from)) adjacency.set(from, []);
    if (!adjacency.has(to)) adjacency.set(to, []);

    adjacency.get(from).push(to);
  }

  const visiting = new Set();
  const visited = new Set();

  function visit(node) {
    if (visiting.has(node)) {
      return [false, node];
    }

    if (visited.has(node)) {
      return [true, null];
    }

    visiting.add(node);

    for (const next of adjacency.get(node) ?? []) {
      const [ok, cycleNode] = visit(next);
      if (!ok) return [false, cycleNode];
    }

    visiting.delete(node);
    visited.add(node);

    return [true, null];
  }

  for (const node of adjacency.keys()) {
    const [ok, cycleNode] = visit(node);

    assert.ok(ok, `dependency graph contains cycle at ${cycleNode}`);
  }
});

test("architecture fitness lint runs successfully", () => {
  assert.doesNotThrow(
    () => runNpm("lint:architecture-fitness"),
    "npm run lint:architecture-fitness should pass"
  );
});

test("repo architecture lint remains green", () => {
  assert.doesNotThrow(
    () => runNpm("lint:repo-architecture"),
    "npm run lint:repo-architecture should pass"
  );
});

test("Phase 8 work-log artifacts exist", () => {
  const requiredFiles = [
    "work-log/tasks/repo-architecture-contract/phases/phase-8-architecture-fitness/metadata.json",
    "work-log/tasks/repo-architecture-contract/phases/phase-8-architecture-fitness/plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-8-architecture-fitness/test-plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-8-architecture-fitness/audit-log.md"
  ];

  for (const file of requiredFiles) {
    assert.ok(exists(file), `Missing Phase 8 work-log artifact: ${file}`);
  }
});

test("Project plan marks Phase 7 complete and Phase 8 present", () => {
  const body = read("docs/tasks/repo-architecture-contract/PROJECT_PLAN.md");

  assert.ok(
    body.includes("Phase 7") && body.includes("Complete"),
    "PROJECT_PLAN.md should mark Phase 7 complete"
  );

  assert.ok(
    body.includes("Phase 8"),
    "PROJECT_PLAN.md should include Phase 8"
  );
});
