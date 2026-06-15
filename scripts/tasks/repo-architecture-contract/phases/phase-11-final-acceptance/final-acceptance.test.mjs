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

test("FINAL_ACCEPTANCE.md exists", () => {
  assert.ok(
    exists("docs/tasks/repo-architecture-contract/FINAL_ACCEPTANCE.md"),
    "Missing docs/tasks/repo-architecture-contract/FINAL_ACCEPTANCE.md"
  );
});

test("FINAL_ACCEPTANCE.md documents all phases 0–11", () => {
  const body = read("docs/tasks/repo-architecture-contract/FINAL_ACCEPTANCE.md");
  for (let i = 0; i <= 11; i++) {
    assert.ok(body.includes(`Phase ${i}`), `FINAL_ACCEPTANCE.md must reference Phase ${i}`);
  }
});

test("FINAL_ACCEPTANCE.md lists required milestone acceptance commands", () => {
  const body = read("docs/tasks/repo-architecture-contract/FINAL_ACCEPTANCE.md");
  const requiredCommands = [
    "test:repo-architecture",
    "lint:contracts",
    "lint:repo-artifacts",
    "lint:deploy",
    "test:deploy",
    "check:repo-architecture"
  ];
  for (const cmd of requiredCommands) {
    assert.ok(body.includes(cmd), `FINAL_ACCEPTANCE.md must reference command: ${cmd}`);
  }
});

test("check:repo-architecture script registered in package.json", () => {
  const pkg = readJson("package.json");
  assert.ok(
    pkg.scripts?.["check:repo-architecture"],
    "package.json missing check:repo-architecture"
  );
});

test("check:repo-architecture chains all required checks", () => {
  const pkg = readJson("package.json");
  const script = pkg.scripts["check:repo-architecture"];
  const requiredSubs = [
    "test:repo-architecture",
    "lint:repo-architecture",
    "lint:contracts",
    "lint:repo-artifacts",
    "lint:deploy",
    "test:deploy"
  ];
  for (const sub of requiredSubs) {
    assert.ok(script.includes(sub), `check:repo-architecture must include ${sub}`);
  }
});

test("architecture-fitness promotes ci-final-acceptance from deferred to implemented", () => {
  const fitness = readJson("metadata/architecture-fitness.json");
  const ciInDeferred = (fitness.deferredChecks ?? []).some(
    (c) => c.id === "ci-final-acceptance"
  );
  assert.ok(!ciInDeferred, "ci-final-acceptance must be removed from deferredChecks");
  const ciInImplemented = (fitness.implementedChecks ?? []).some(
    (c) => c.id === "ci-final-acceptance"
  );
  assert.ok(ciInImplemented, "ci-final-acceptance must be added to implementedChecks");
});

test("architecture-fitness preserves exclusion entry", () => {
  const fitness = readJson("metadata/architecture-fitness.json");
  const exclusions = fitness.exclusions ?? [];
  const apiDocExclusion = exclusions.find(
    (e) => e.id === "api-doc-drift-enforcement-refs-api-docs"
  );
  assert.ok(apiDocExclusion, "api-doc-drift-enforcement-refs-api-docs exclusion must be preserved");
});

test("metadata/catalog.json references FINAL_ACCEPTANCE.md", () => {
  const catalog = readJson("metadata/catalog.json");
  const catText = JSON.stringify(catalog);
  assert.ok(
    catText.includes("FINAL_ACCEPTANCE"),
    "metadata/catalog.json must reference FINAL_ACCEPTANCE.md"
  );
});

test("Phase 11 work-log artifacts exist", () => {
  const requiredFiles = [
    "work-log/tasks/repo-architecture-contract/phases/phase-11-final-acceptance/metadata.json",
    "work-log/tasks/repo-architecture-contract/phases/phase-11-final-acceptance/plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-11-final-acceptance/test-plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-11-final-acceptance/audit-log.md"
  ];
  for (const file of requiredFiles) {
    assert.ok(exists(file), `Missing Phase 11 work-log artifact: ${file}`);
  }
});

test("Phase 11 test metadata.json exists", () => {
  assert.ok(
    exists("scripts/tasks/repo-architecture-contract/phases/phase-11-final-acceptance/metadata.json"),
    "Missing scripts/tasks/repo-architecture-contract/phases/phase-11-final-acceptance/metadata.json"
  );
});

test("PROJECT_PLAN.md marks Phase 11 Complete", () => {
  const body = read("docs/tasks/repo-architecture-contract/PROJECT_PLAN.md");
  assert.ok(
    body.includes("Phase 11 | CI/final acceptance | Complete"),
    "PROJECT_PLAN.md should mark Phase 11 as Complete"
  );
});

test("npm run check:repo-architecture passes", () => {
  assert.doesNotThrow(
    () => runNpm("check:repo-architecture"),
    "npm run check:repo-architecture should pass"
  );
});

test("npm run lint:repo-architecture remains green", () => {
  assert.doesNotThrow(
    () => runNpm("lint:repo-architecture"),
    "npm run lint:repo-architecture should pass"
  );
});

test("npm run test:repo-architecture remains green", () => {
  assert.doesNotThrow(
    () => runNpm("test:repo-architecture"),
    "npm run test:repo-architecture should pass"
  );
});
