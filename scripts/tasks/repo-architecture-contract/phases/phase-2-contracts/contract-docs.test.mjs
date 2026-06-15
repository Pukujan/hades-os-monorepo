import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const phase2Contracts = [
  "docCanonicalSource.contract.md",
  "taskArtifactLayout.contract.md",
  "moduleMetadata.contract.md",
  "modulePublicApi.contract.md",
  "repoCatalog.contract.md",
  "routeManifest.contract.md",
  "architectureFitness.contract.md",
  "adrLifecycle.contract.md"
];

const requiredSections = [
  "## Purpose",
  "## Scope",
  "## Rules",
  "## Required artifacts",
  "## Enforcement",
  "## Non-goals"
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

test("Phase 2 contract docs exist and contain required sections", () => {
  for (const file of phase2Contracts) {
    const relativePath = `docs/architecture/contracts/${file}`;

    assert.ok(
      exists(relativePath),
      `Missing Phase 2 contract doc: ${relativePath}`
    );

    const body = read(relativePath);

    for (const section of requiredSections) {
      assert.ok(
        body.includes(section),
        `Contract ${file} is missing required section: ${section}`
      );
    }
  }
});

test("Phase 2 contracts are registered in contract manifest", () => {
  const manifest = readJson("docs/architecture/contracts/manifest.json");
  const manifestText = JSON.stringify(manifest, null, 2);

  for (const file of phase2Contracts) {
    assert.ok(
      manifestText.includes(file) || manifestText.includes(file.replace(".contract.md", "")),
      `Contract manifest does not reference ${file}`
    );
  }
});

test("Phase 2 manifest contract docs exist on disk", () => {
  for (const file of phase2Contracts) {
    assert.ok(
      exists(`docs/architecture/contracts/${file}`),
      `Manifest should point to an existing contract file: ${file}`
    );
  }
});

test("Phase 2 changelog entry exists and changelog is valid JSONL", () => {
  const changelogPath = "docs/architecture/contracts/changelog.jsonl";
  assert.ok(exists(changelogPath), `Missing changelog: ${changelogPath}`);

  const lines = read(changelogPath)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      assert.fail(`Invalid JSONL at changelog line ${index + 1}: ${error.message}`);
    }
  });

  const phase2Entry = parsed.find((entry) =>
    JSON.stringify(entry).includes("repo-architecture-contract") &&
    JSON.stringify(entry).includes("phase-2-contracts")
  );

  assert.ok(
    phase2Entry,
    "Missing changelog entry for repo-architecture-contract phase-2-contracts"
  );
});

test("Architecture overview references Phase 2 contracts", () => {
  const overviewPath = "docs/architecture/CONTRACTS_OVERVIEW.md";
  assert.ok(exists(overviewPath), `Missing overview doc: ${overviewPath}`);

  const overview = read(overviewPath);

  for (const file of phase2Contracts) {
    const contractName = file.replace(".contract.md", "");
    assert.ok(
      overview.includes(contractName) || overview.includes(file),
      `CONTRACTS_OVERVIEW.md does not reference ${file}`
    );
  }
});

test("Repo artifact layout references task/module/catalog architecture", () => {
  const layoutPath = "docs/architecture/REPO_ARTIFACT_LAYOUT.md";
  assert.ok(exists(layoutPath), `Missing artifact layout doc: ${layoutPath}`);

  const layout = read(layoutPath);

  const requiredTerms = [
    "work-log/tasks",
    "scripts/tasks",
    "docs/tasks",
    "module.json",
    "metadata"
  ];

  for (const term of requiredTerms) {
    assert.ok(
      layout.includes(term),
      `REPO_ARTIFACT_LAYOUT.md does not reference required layout term: ${term}`
    );
  }
});

test("Phase 2 work-log artifacts exist", () => {
  const requiredFiles = [
    "work-log/tasks/repo-architecture-contract/phases/phase-2-contracts/metadata.json",
    "work-log/tasks/repo-architecture-contract/phases/phase-2-contracts/plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-2-contracts/test-plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-2-contracts/audit-log.md"
  ];

  for (const file of requiredFiles) {
    assert.ok(exists(file), `Missing Phase 2 work-log artifact: ${file}`);
  }
});
