import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");

function fileExists(rel) {
  return existsSync(join(repoRoot, rel));
}

function readJson(rel) {
  return JSON.parse(readFileSync(join(repoRoot, rel), "utf8"));
}

function assertJsonFile(rel) {
  const abs = join(repoRoot, rel);
  assert.equal(existsSync(abs), true, `Missing JSON file: ${rel}`);
  const parsed = JSON.parse(readFileSync(abs, "utf8"));
  assert.equal(typeof parsed, "object", `Invalid JSON in: ${rel}`);
  return parsed;
}

function findFiles(rootRel, predicate) {
  const root = join(repoRoot, rootRel);
  if (!existsSync(root)) return [];
  const results = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (predicate(entry.name)) results.push(full);
    }
  };
  visit(root);
  return results;
}

// ── 1. Task Metadata Exists ──────────────────────────────────

test("task metadata files exist (Phase 0)", () => {
  const required = [
    "work-log/tasks/repo-architecture-contract/metadata.json",
    "scripts/tasks/repo-architecture-contract/metadata.json",
    "docs/tasks/repo-architecture-contract/README.md",
    "docs/tasks/repo-architecture-contract/PROJECT_PLAN.md",
    "docs/tasks/repo-architecture-contract/ACCEPTANCE.md",
  ];

  for (const rel of required) {
    assert.equal(
      fileExists(rel),
      true,
      `Missing task metadata file: ${rel}`
    );
  }
});

test("task metadata JSON is valid", () => {
  const meta1 = assertJsonFile("work-log/tasks/repo-architecture-contract/metadata.json");
  const meta2 = assertJsonFile("scripts/tasks/repo-architecture-contract/metadata.json");

  assert.equal(meta1.task, "repo-architecture-contract");
  assert.equal(meta1.taskType, "overall-project");
  assert.equal(meta1.runtimeBehaviorChange, false);
  assert.equal(meta1.deploymentBehaviorChange, false);

  assert.equal(meta2.task, "repo-architecture-contract");
  assert.equal(meta2.taskType, "overall-project");
  assert.equal(meta2.runtimeBehaviorChange, false);
  assert.equal(meta2.deploymentBehaviorChange, false);
});

// ── 2. Phase Metadata Exists ─────────────────────────────────

test("phase metadata files exist (Phase 1)", () => {
  const required = [
    "scripts/tasks/repo-architecture-contract/phases/phase-1-red-tests/metadata.json",
    "work-log/tasks/repo-architecture-contract/phases/phase-1-red-tests/metadata.json",
    "work-log/tasks/repo-architecture-contract/phases/phase-1-red-tests/plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-1-red-tests/test-plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-1-red-tests/audit-log.md",
  ];

  for (const rel of required) {
    assert.equal(
      fileExists(rel),
      true,
      `Missing phase metadata file: ${rel}`
    );
  }
});

test("phase metadata JSON is valid", () => {
  const meta1 = assertJsonFile("scripts/tasks/repo-architecture-contract/phases/phase-1-red-tests/metadata.json");
  const meta2 = assertJsonFile("work-log/tasks/repo-architecture-contract/phases/phase-1-red-tests/metadata.json");

  assert.equal(meta1.phase, "phase-1-red-tests");
  assert.equal(meta1.task, "repo-architecture-contract");
  assert.equal(meta1.runtimeBehaviorChange, false);
  assert.equal(meta1.deploymentBehaviorChange, false);

  assert.equal(meta2.phase, "phase-1-red-tests");
  assert.equal(meta2.task, "repo-architecture-contract");
  assert.equal(meta2.runtimeBehaviorChange, false);
  assert.equal(meta2.deploymentBehaviorChange, false);
});

// ── 3. Future Metadata Catalog Files (Expected Red) ─────────

test("metadata catalog files exist (expected RED until Phase 3)", () => {
  const required = [
    "metadata/repo.json",
    "metadata/catalog.json",
    "metadata/modules.json",
    "metadata/tasks.json",
    "metadata/contracts.json",
    "metadata/apis.json",
    "metadata/architecture-fitness.json",
    "metadata/dependency-graph.json",
  ];

  for (const rel of required) {
    assert.equal(
      fileExists(rel),
      true,
      `Missing metadata catalog file: ${rel}. This was expected red state until Phase 3 (now complete).`
    );
  }
});

// ── 4. Future Module Manifests (Expected Red) ────────────────

test("module manifests exist (expected RED until Phase 4)", () => {
  const required = [
    "backend/src/modules/auth/module.json",
    "backend/src/modules/hades/module.json",
    "backend/src/modules/model-condenser/module.json",
    "backend/src/modules/_reference/module.json",
    "frontend/src/modules/hades/module.json",
    "frontend/src/modules/_reference/module.json",
  ];

  for (const rel of required) {
    assert.equal(
      fileExists(rel),
      true,
      `Missing module manifest: ${rel}. This is expected red state until Phase 4.`
    );
  }
});

// ── 5. Future Generated Indexes (Expected Red) ───────────────

test("generated indexes exist (Phase 5 complete)", () => {
  const required = [
    "docs/INDEX.md",
    "docs/modules/INDEX.md",
    "docs/tasks/INDEX.md",
    "scripts/tasks/INDEX.md",
    "work-log/tasks/INDEX.md",
  ];

  for (const rel of required) {
    assert.equal(
      fileExists(rel),
      true,
      `Missing generated index: ${rel}. Phase 5 should have created this.`
    );
  }
});

// ── 6. Future Contract Docs (Expected Red) ───────────────────

test("future contract docs exist (expected RED until Phase 5)", () => {
  const required = [
    "docs/architecture/contracts/docCanonicalSource.contract.md",
    "docs/architecture/contracts/taskArtifactLayout.contract.md",
    "docs/architecture/contracts/moduleMetadata.contract.md",
    "docs/architecture/contracts/modulePublicApi.contract.md",
    "docs/architecture/contracts/repoCatalog.contract.md",
    "docs/architecture/contracts/routeManifest.contract.md",
    "docs/architecture/contracts/architectureFitness.contract.md",
    "docs/architecture/contracts/adrLifecycle.contract.md",
  ];

  for (const rel of required) {
    assert.equal(
      fileExists(rel),
      true,
      `Missing future contract doc: ${rel}. This is expected red state until Phase 5.`
    );
  }
});

// ── 7. Duplicate Authored Docs Risk ──────────────────────────

test("detect potential duplicate authored docs between docs/ and additional-modules/docs/", () => {
  const docsMds = findFiles("docs", (name) => name.endsWith(".md"));
  const additionalDocsMds = findFiles("additional-modules/docs", (name) => name.endsWith(".md"));

  const docsBasenames = new Set(docsMds.map((f) => f.split("/").pop()));
  const duplicates = additionalDocsMds.filter((f) => docsBasenames.has(f.split("/").pop()));

  // This is a detection audit, not a cleanup mandate.
  // Report duplicates as information, not as a hard failure.
  if (duplicates.length > 0) {
    console.log(`\nINFO: Found ${duplicates.length} potential duplicate authored docs:`);
    for (const d of duplicates) {
      console.log(`  - additional-modules/docs/${d.split("additional-modules/docs/").pop()}`);
    }
    console.log("These are not deleted in Phase 1. See audit-log.md for details.\n");
  }

  // Pass the test — this is informational only
  assert.ok(true, "Duplicate detection scan completed. See output above and audit-log.md.");
});

// ── 8. Package Script Exists ─────────────────────────────────

test("package.json contains test:repo-architecture script", () => {
  const pkg = assertJsonFile("package.json");
  assert.equal(
    typeof pkg.scripts?.["test:repo-architecture"],
    "string",
    "Missing package.json script: test:repo-architecture"
  );
});

test("package.json contains lint:repo-architecture:red script", () => {
  const pkg = assertJsonFile("package.json");
  assert.equal(
    typeof pkg.scripts?.["lint:repo-architecture:red"],
    "string",
    "Missing package.json script: lint:repo-architecture:red"
  );
});
