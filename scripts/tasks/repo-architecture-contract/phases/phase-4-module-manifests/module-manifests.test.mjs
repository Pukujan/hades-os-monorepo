import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

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
  "owns", "dependsOn", "forbiddenDependencies", "apiDocs", "tests"
];

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

test("Phase 4 module manifests exist and are valid JSON", () => {
  for (const item of requiredModuleManifests) {
    assert.ok(exists(item.path), `Missing module manifest: ${item.path}`);
    assert.doesNotThrow(
      () => readJson(item.path),
      `Module manifest is not valid JSON: ${item.path}`
    );
  }
});

test("Phase 4 module manifests include required fields and valid types", () => {
  const validTypes = new Set(["product", "platform", "reference"]);
  const validStatuses = new Set(["active", "reference", "planned", "deprecated"]);
  const validSides = new Set(["backend", "frontend"]);

  for (const item of requiredModuleManifests) {
    const manifest = readJson(item.path);

    for (const field of requiredFields) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(manifest, field),
        `${item.path} is missing required field: ${field}`
      );
    }

    assert.equal(
      manifest.module, item.id,
      `${item.path} module field must be ${item.id}`
    );

    assert.equal(
      manifest.side, item.side,
      `${item.path} side field must be ${item.side}`
    );

    assert.ok(validTypes.has(manifest.type), `${item.path} has invalid type`);
    assert.ok(validStatuses.has(manifest.status), `${item.path} has invalid status`);
    assert.ok(validSides.has(manifest.side), `${item.path} has invalid side`);

    for (const arrayField of ["owns", "dependsOn", "forbiddenDependencies", "tests"]) {
      assert.ok(
        Array.isArray(manifest[arrayField]),
        `${item.path} field ${arrayField} must be an array`
      );
    }
  }
});

test("Phase 4 module manifests point to API docs or documented transition paths", () => {
  for (const item of requiredModuleManifests) {
    const manifest = readJson(item.path);

    assert.equal(
      typeof manifest.apiDocs, "string",
      `${item.path} apiDocs must be a string`
    );

    const apiDocExists = exists(manifest.apiDocs);
    const isTransitionDoc =
      manifest.apiDocs.includes("docs/modules/") ||
      manifest.apiDocs.includes("docs/") ||
      manifest.apiDocs === "none";

    assert.ok(
      apiDocExists || isTransitionDoc,
      `${item.path} apiDocs must point to an existing doc or documented transition path`
    );
  }
});

test("metadata/modules.json references real module manifests and clears pending status", () => {
  const modules = readJson("metadata/modules.json");
  const text = JSON.stringify(modules);

  for (const item of requiredModuleManifests) {
    assert.ok(
      text.includes(item.path),
      `metadata/modules.json must reference manifest path: ${item.path}`
    );
  }

  assert.ok(
    !text.includes("pending-module-json"),
    "metadata/modules.json should not mark required Phase 4 modules as pending-module-json after manifests exist"
  );
});

test("dependency graph includes module nodes", () => {
  const graph = readJson("metadata/dependency-graph.json");
  const text = JSON.stringify(graph);

  assert.ok(Array.isArray(graph.nodes), "dependency graph must include nodes array");

  for (const item of requiredModuleManifests) {
    const nodeId = `${item.side}:${item.id}`;
    assert.ok(
      text.includes(nodeId) || text.includes(item.id),
      `dependency graph should include module node: ${nodeId}`
    );
  }
});

test("catalog includes module entries", () => {
  const catalog = readJson("metadata/catalog.json");
  const text = JSON.stringify(catalog);

  for (const item of requiredModuleManifests) {
    assert.ok(
      text.includes(item.id),
      `metadata/catalog.json should include module: ${item.id}`
    );
  }

  assert.ok(
    text.includes("modules"),
    "metadata/catalog.json must include modules catalog group"
  );
});

test("Phase 4 work-log artifacts exist", () => {
  const requiredFiles = [
    "work-log/tasks/repo-architecture-contract/phases/phase-4-module-manifests/metadata.json",
    "work-log/tasks/repo-architecture-contract/phases/phase-4-module-manifests/plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-4-module-manifests/test-plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-4-module-manifests/audit-log.md"
  ];

  for (const file of requiredFiles) {
    assert.ok(exists(file), `Missing Phase 4 work-log artifact: ${file}`);
  }
});
