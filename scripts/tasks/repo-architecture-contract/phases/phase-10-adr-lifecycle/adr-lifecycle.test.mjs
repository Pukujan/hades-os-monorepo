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

const REQUIRED_ADR_IDS = [
  "ADR-0001", "ADR-0002", "ADR-0003", "ADR-0004",
  "ADR-0005", "ADR-0006", "ADR-0007", "ADR-0008"
];

const VALID_STATUSES = ["Accepted", "Superseded", "Deprecated", "Proposed"];

const REQUIRED_SECTIONS = ["## Status", "## Context", "## Decision", "## Consequences", "## Links"];

test("ADR directory exists", () => {
  assert.ok(exists("docs/architecture/adr"), "Missing docs/architecture/adr/ directory");
});

test("ADR README exists with status values and rules", () => {
  assert.ok(exists("docs/architecture/adr/README.md"), "Missing docs/architecture/adr/README.md");
  const readme = read("docs/architecture/adr/README.md");
  assert.ok(readme.includes("ADR"), "README.md must mention ADR");
  for (const status of VALID_STATUSES) {
    assert.ok(readme.includes(status), `README.md must document status: ${status}`);
  }
});

test("ADR INDEX.md exists as ADR registry", () => {
  assert.ok(exists("docs/architecture/adr/INDEX.md"), "Missing docs/architecture/adr/INDEX.md");
  const index = read("docs/architecture/adr/INDEX.md");
  assert.ok(index.includes("ADR"), "INDEX.md must mention ADR");
  for (const adrId of REQUIRED_ADR_IDS) {
    assert.ok(index.includes(adrId), `INDEX.md must reference ${adrId}`);
  }
});

for (const adrId of REQUIRED_ADR_IDS) {
  const num = adrId.replace("ADR-", "");
  test(`ADR file ${adrId} exists`, () => {
    const files = fs.readdirSync(full("docs/architecture/adr"))
      .filter(f => f.startsWith(`${num}-`) && f.endsWith(".md") && f !== "README.md" && f !== "INDEX.md");
    assert.ok(files.length >= 1, `Missing ADR file for ${adrId} in docs/architecture/adr/`);
  });
}

test("Each ADR has required sections", () => {
  const files = fs.readdirSync(full("docs/architecture/adr"))
    .filter(f => f.endsWith(".md") && f !== "README.md" && f !== "INDEX.md");
  assert.ok(files.length >= REQUIRED_ADR_IDS.length, `Expected at least ${REQUIRED_ADR_IDS.length} ADR files, found ${files.length}`);
  for (const file of files) {
    const content = read(`docs/architecture/adr/${file}`);
    assert.ok(/^# ADR-\d{4}/m.test(content), `ADR file ${file} must start with # ADR-NNNN title`);
    for (const section of REQUIRED_SECTIONS) {
      assert.ok(content.includes(section), `ADR file ${file} missing required section: ${section}`);
    }
    const statusMatch = content.match(/^## Status\s*\n\s*(.+)/m);
    assert.ok(statusMatch, `ADR file ${file} must have a Status value`);
    if (statusMatch) {
      const status = statusMatch[1].trim();
      assert.ok(
        VALID_STATUSES.includes(status),
        `ADR file ${file} has invalid status "${status}". Valid: ${VALID_STATUSES.join(", ")}`
      );
    }
  }
});

test("metadata/adrs.json exists and is valid JSON", () => {
  assert.ok(exists("metadata/adrs.json"), "Missing metadata/adrs.json");
  const adrs = readJson("metadata/adrs.json");
  assert.ok(Array.isArray(adrs.adrs), "metadata/adrs.json must have an adrs array");
});

test("metadata/adrs.json references all required ADRs", () => {
  const adrs = readJson("metadata/adrs.json");
  const ids = adrs.adrs.map(a => a.id);
  for (const requiredId of REQUIRED_ADR_IDS) {
    assert.ok(ids.includes(requiredId), `metadata/adrs.json missing entry for ${requiredId}`);
  }
  for (const entry of adrs.adrs) {
    assert.ok(entry.id, `ADR entry missing id`);
    assert.ok(entry.title, `ADR ${entry.id} missing title`);
    assert.ok(entry.status, `ADR ${entry.id} missing status`);
    assert.ok(
      VALID_STATUSES.includes(entry.status),
      `ADR ${entry.id} has invalid status "${entry.status}". Valid: ${VALID_STATUSES.join(", ")}`
    );
    assert.ok(entry.path, `ADR ${entry.id} missing path`);
    assert.ok(entry.phase, `ADR ${entry.id} missing phase`);
  }
});

test("metadata/catalog.json references ADRs", () => {
  const catalog = readJson("metadata/catalog.json");
  const catText = JSON.stringify(catalog);
  assert.ok(
    catText.includes("adrs") || catText.includes("adr"),
    "metadata/catalog.json must reference ADRs"
  );
});

test("metadata/architecture-fitness.json promotes adr-lifecycle from deferred to implemented", () => {
  const fitness = readJson("metadata/architecture-fitness.json");

  const adrInDeferred = (fitness.deferredChecks ?? []).some(
    (c) => c.id === "adr-lifecycle"
  );
  assert.ok(!adrInDeferred, "adr-lifecycle must be removed from deferredChecks");

  const adrInImplemented = (fitness.implementedChecks ?? []).some(
    (c) => c.id === "adr-lifecycle"
  );
  assert.ok(adrInImplemented, "adr-lifecycle must be added to implementedChecks");
});

test("lint-adr-lifecycle.mjs script exists", () => {
  assert.ok(
    exists("scripts/core/lint-adr-lifecycle.mjs"),
    "Missing scripts/core/lint-adr-lifecycle.mjs"
  );
});

test("package.json registers lint:adr-lifecycle script", () => {
  const pkg = readJson("package.json");
  assert.ok(
    pkg.scripts?.["lint:adr-lifecycle"],
    "package.json missing lint:adr-lifecycle"
  );
  assert.ok(
    pkg.scripts["lint:adr-lifecycle"].includes("scripts/core/lint-adr-lifecycle.mjs"),
    "lint:adr-lifecycle must run scripts/core/lint-adr-lifecycle.mjs"
  );
});

test("lint:repo-architecture includes lint:adr-lifecycle", () => {
  const pkg = readJson("package.json");
  assert.ok(
    pkg.scripts?.["lint:repo-architecture"],
    "package.json missing lint:repo-architecture"
  );
  assert.ok(
    pkg.scripts["lint:repo-architecture"].includes("lint:adr-lifecycle"),
    "lint:repo-architecture must include lint:adr-lifecycle in Phase 10"
  );
});

test("lint:adr-lifecycle passes", () => {
  assert.doesNotThrow(
    () => runNpm("lint:adr-lifecycle"),
    "npm run lint:adr-lifecycle should pass"
  );
});

test("lint:repo-architecture remains green", () => {
  assert.doesNotThrow(
    () => runNpm("lint:repo-architecture"),
    "npm run lint:repo-architecture should pass"
  );
});

test("Phase 10 work-log artifacts exist", () => {
  const requiredFiles = [
    "work-log/tasks/repo-architecture-contract/phases/phase-10-adr-lifecycle/metadata.json",
    "work-log/tasks/repo-architecture-contract/phases/phase-10-adr-lifecycle/plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-10-adr-lifecycle/test-plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-10-adr-lifecycle/audit-log.md"
  ];
  for (const file of requiredFiles) {
    assert.ok(exists(file), `Missing Phase 10 work-log artifact: ${file}`);
  }
});

test("Project plan marks Phase 9 complete and Phase 10 present", () => {
  const body = read("docs/tasks/repo-architecture-contract/PROJECT_PLAN.md");
  assert.ok(
    body.includes("Phase 9") && body.includes("Complete"),
    "PROJECT_PLAN.md should mark Phase 9 complete"
  );
  assert.ok(
    body.includes("Phase 10"),
    "PROJECT_PLAN.md should include Phase 10"
  );
});
