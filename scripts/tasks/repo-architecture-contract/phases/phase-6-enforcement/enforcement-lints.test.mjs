import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();

const lintScripts = [
  "scripts/core/lint-doc-canonical-source.mjs",
  "scripts/core/lint-task-artifacts.mjs",
  "scripts/core/lint-module-metadata.mjs",
  "scripts/core/lint-repo-catalog.mjs"
];

const lintCommands = [
  "lint:doc-canonical",
  "lint:task-artifacts",
  "lint:module-metadata",
  "lint:repo-catalog"
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

function runNpm(script) {
  return execFileSync("npm", ["run", script], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

test("Phase 6 lint scripts exist", () => {
  for (const script of lintScripts) {
    assert.ok(exists(script), `Missing Phase 6 lint script: ${script}`);
  }
});

test("Package scripts register Phase 6 lints", () => {
  const pkg = readJson("package.json");

  for (const command of lintCommands) {
    assert.ok(pkg.scripts?.[command], `package.json missing script: ${command}`);
  }

  assert.ok(
    pkg.scripts?.["lint:repo-architecture"],
    "package.json missing script: lint:repo-architecture"
  );

  const repoArchitectureScript = pkg.scripts["lint:repo-architecture"];

  for (const command of lintCommands) {
    assert.ok(
      repoArchitectureScript.includes(command),
      `lint:repo-architecture must include ${command}`
    );
  }
});

test("Phase 6 lint commands run successfully", () => {
  for (const command of lintCommands) {
    assert.doesNotThrow(
      () => runNpm(command),
      `npm run ${command} should pass`
    );
  }
});

test("lint:repo-architecture runs successfully", () => {
  assert.doesNotThrow(
    () => runNpm("lint:repo-architecture"),
    "npm run lint:repo-architecture should pass"
  );
});

test("Phase 6 work-log artifacts exist", () => {
  const requiredFiles = [
    "work-log/tasks/repo-architecture-contract/phases/phase-6-enforcement/metadata.json",
    "work-log/tasks/repo-architecture-contract/phases/phase-6-enforcement/plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-6-enforcement/test-plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-6-enforcement/audit-log.md"
  ];

  for (const file of requiredFiles) {
    assert.ok(exists(file), `Missing Phase 6 work-log artifact: ${file}`);
  }
});

test("Project plan marks Phase 5 complete and Phase 6 present", () => {
  const body = read("docs/tasks/repo-architecture-contract/PROJECT_PLAN.md");

  assert.ok(
    body.includes("Phase 5") && body.includes("Complete"),
    "PROJECT_PLAN.md should mark Phase 5 complete"
  );

  assert.ok(
    body.includes("Phase 6"),
    "PROJECT_PLAN.md should include Phase 6"
  );
});
