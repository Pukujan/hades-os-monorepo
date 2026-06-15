import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

// ── Phase 0: Project Scope and Safety Metadata ────────────────

test("Phase 0: Task docs exist", () => {
  const required = [
    "docs/tasks/repo-architecture-contract/README.md",
    "docs/tasks/repo-architecture-contract/PROJECT_PLAN.md",
    "docs/tasks/repo-architecture-contract/ACCEPTANCE.md",
  ];
  for (const f of required) {
    assert.ok(exists(f), `Missing Phase 0 doc: ${f}`);
  }
});

test("Phase 0: Task metadata JSON files exist and have required fields", () => {
  const metaPaths = [
    "scripts/tasks/repo-architecture-contract/metadata.json",
    "work-log/tasks/repo-architecture-contract/metadata.json",
  ];

  const requiredFields = ["task", "taskType", "branch", "status", "purpose", "activePhases", "runtimeBehaviorChange", "deploymentBehaviorChange"];

  for (const mp of metaPaths) {
    assert.ok(exists(mp), `Missing task metadata: ${mp}`);
    const meta = readJson(mp);
    for (const field of requiredFields) {
      assert.ok(meta[field] !== undefined, `${mp} missing field: ${field}`);
    }
    assert.equal(meta.runtimeBehaviorChange, false, `${mp} runtimeBehaviorChange must be false`);
    assert.equal(meta.deploymentBehaviorChange, false, `${mp} deploymentBehaviorChange must be false`);
  }
});

test("Phase 0: Task metadata contains correct task name and branch", () => {
  for (const mp of ["scripts/tasks/repo-architecture-contract/metadata.json", "work-log/tasks/repo-architecture-contract/metadata.json"]) {
    const meta = readJson(mp);
    assert.equal(meta.task, "repo-architecture-contract");
    assert.equal(meta.branch.preferred, "refactor/repo-architecture-contract");
    assert.equal(meta.branch.fallback, "codex/refactor-repo-architecture-contract");
  }
});

test("Phase 0: Task docs mention key concepts", () => {
  const readme = read("docs/tasks/repo-architecture-contract/README.md");
  assert.ok(readme.includes("repo-architecture-contract"));
  assert.ok(readme.includes("contracted modular monolith"));
  assert.ok(readme.includes("OpenCode"));
  assert.ok(readme.includes("TDD"));
  assert.ok(readme.includes("work-log/tasks/repo-architecture-contract/handoffs"));
  assert.ok(readme.includes("scripts/tasks/repo-architecture-contract"));
});

// ── Phase 1: Red Tests ───────────────────────────────────────

test("Phase 1: All phase 1 files exist", () => {
  const required = [
    "scripts/tasks/repo-architecture-contract/phases/phase-1-red-tests/metadata.json",
    "scripts/tasks/repo-architecture-contract/phases/phase-1-red-tests/repo-architecture-contract.test.mjs",
    "scripts/tasks/repo-architecture-contract/phases/phase-1-red-tests/lint-repo-architecture-red.mjs",
    "work-log/tasks/repo-architecture-contract/phases/phase-1-red-tests/metadata.json",
    "work-log/tasks/repo-architecture-contract/phases/phase-1-red-tests/plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-1-red-tests/test-plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-1-red-tests/audit-log.md",
  ];
  for (const f of required) {
    assert.ok(exists(f), `Missing Phase 1 file: ${f}`);
  }
});

test("Phase 1: Phase metadata is valid", () => {
  for (const mp of ["scripts/tasks/repo-architecture-contract/phases/phase-1-red-tests/metadata.json", "work-log/tasks/repo-architecture-contract/phases/phase-1-red-tests/metadata.json"]) {
    const meta = readJson(mp);
    assert.equal(meta.phase, "phase-1-red-tests");
    assert.equal(meta.task, "repo-architecture-contract");
    assert.equal(meta.runtimeBehaviorChange, false);
    assert.equal(meta.deploymentBehaviorChange, false);
  }
});

test("Phase 1: Red test file references future red categories", () => {
  const testBody = read("scripts/tasks/repo-architecture-contract/phases/phase-1-red-tests/repo-architecture-contract.test.mjs");

  const expectedRedRefs = [
    "metadata/repo.json",
    "metadata/catalog.json",
    "metadata/modules.json",
    "metadata/tasks.json",
    "metadata/contracts.json",
    "metadata/apis.json",
    "metadata/architecture-fitness.json",
    "metadata/dependency-graph.json",
    "module.json",
    "docs/INDEX.md",
    "docs/modules/INDEX.md",
    "docs/tasks/INDEX.md",
    "scripts/tasks/INDEX.md",
    "work-log/tasks/INDEX.md",
  ];

  for (const ref of expectedRedRefs) {
    assert.ok(testBody.includes(ref), `Phase 1 test file does not reference future red category: ${ref}`);
  }
});

test("Phase 1: Audit log mentions expected red failures and safety constraints", () => {
  const auditLog = read("work-log/tasks/repo-architecture-contract/phases/phase-1-red-tests/audit-log.md");

  const requiredMentions = [
    "Expected Red Failures",
    "metadata catalog",
    "module manifests",
    "generated indexes",
    "contract docs",
    "Runtime behavior",
    "Deployment behavior",
  ];

  for (const mention of requiredMentions) {
    assert.ok(auditLog.includes(mention), `Phase 1 audit log does not mention: ${mention}`);
  }
});

// ── Package Script Regression ─────────────────────────────────

test("Package.json contains test:repo-architecture script", () => {
  const pkg = readJson("package.json");
  assert.equal(
    typeof pkg.scripts?.["test:repo-architecture"],
    "string",
    "Missing package.json script: test:repo-architecture"
  );
});

test("Package.json contains lint:repo-architecture:red script", () => {
  const pkg = readJson("package.json");
  assert.equal(
    typeof pkg.scripts?.["lint:repo-architecture:red"],
    "string",
    "Missing package.json script: lint:repo-architecture:red"
  );
});
