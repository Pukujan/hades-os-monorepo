import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const LINT_SCRIPT = path.join(root, "scripts", "core", "lint-doc-canonical-source.mjs");
const COMPAT_DIR = path.join(root, "additional-modules", "docs");
const REGISTRY_PATH = path.join(root, "docs", "legacy-registry.json");

const POINTER_GENERATED_MARKER = /<!--\s*(pointer|generated)\s*-->/i;
const VALID_STATUSES = ["pointer", "generated", "legacy", "redirect", "orphaned"];

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

function walkMd(dir) {
  let files = [];
  try {
    for (const dent of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, dent.name);
      if (dent.isDirectory()) {
        files = files.concat(walkMd(fp));
      } else if (dent.isFile() && dent.name.endsWith(".md")) {
        files.push(fp);
      }
    }
  } catch { /* skip unreadable */ }
  return files;
}

function runLintInDir(cwd) {
  try {
    execFileSync("node", [LINT_SCRIPT], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return { code: 0, stderr: "" };
  } catch (e) {
    return { code: e.status ?? 1, stderr: e.stderr?.toString() ?? "" };
  }
}

// ===================== Positive Tests =====================

test("Phase 7: registry exists", () => {
  assert.ok(exists("docs/legacy-registry.json"), "docs/legacy-registry.json must exist");
});

test("Phase 7: registry schema is valid", () => {
  const reg = readJson("docs/legacy-registry.json");
  assert.equal(typeof reg.schemaVersion, "number");
  assert.equal(typeof reg.canonicalRoot, "string");
  assert.ok(reg.canonicalRoot.length > 0);
  assert.equal(typeof reg.compatibilityRoot, "string");
  assert.ok(reg.compatibilityRoot.length > 0);
  assert.ok(Array.isArray(reg.entries));
});

test("Phase 7: no entry has blank canonical or compatibility", () => {
  const reg = readJson("docs/legacy-registry.json");
  for (const [i, entry] of reg.entries.entries()) {
    assert.ok(
      typeof entry.canonical === "string" && entry.canonical.length > 0,
      `entries[${i}].canonical must be non-empty`
    );
    assert.ok(
      typeof entry.compatibility === "string" && entry.compatibility.length > 0,
      `entries[${i}].compatibility must be non-empty`
    );
  }
});

test("Phase 7: all entries have valid status", () => {
  const reg = readJson("docs/legacy-registry.json");
  for (const [i, entry] of reg.entries.entries()) {
    assert.ok(
      VALID_STATUSES.includes(entry.status),
      `entries[${i}].status must be one of: ${VALID_STATUSES.join(", ")}`
    );
  }
});

test("Phase 7: all Markdown files are classified", () => {
  const compatRoot = COMPAT_DIR;
  const reg = readJson("docs/legacy-registry.json");
  const registryPaths = new Set(reg.entries.map((e) => e.compatibility));
  const mdFiles = walkMd(compatRoot);

  for (const fp of mdFiles) {
    const rel = path.relative(compatRoot, fp);
    const content = fs.readFileSync(fp, "utf8");
    if (POINTER_GENERATED_MARKER.test(content)) continue;
    assert.ok(
      registryPaths.has(rel),
      `additional-modules/docs/${rel} is not registered and has no pointer/generated marker`
    );
  }
});

test("Phase 7: DEPLOY.md has pointer/generated marker or canonical ref", () => {
  const content = read("additional-modules/docs/DEPLOY.md");
  const hasMarker = POINTER_GENERATED_MARKER.test(content);
  const hasCanonicalRef = /docs\/DEPLOY\.md|canonical|pointer|generated|legacy/i.test(content);
  assert.ok(hasMarker || hasCanonicalRef, "DEPLOY.md must have pointer/generated marker or canonical reference");
});

test("Phase 7: lint:doc-canonical exits 0", () => {
  const result = runLintInDir(root);
  assert.equal(result.code, 0, `lint:doc-canonical should pass (code=${result.code})`);
});

// ===================== Negative Tests =====================

test("Phase 7: missing registry fails", () => {
  const tmp = fs.mkdtempSync(path.join(root, "tmp-p7-neg1-"));
  try {
    fs.mkdirSync(path.join(tmp, "docs"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "additional-modules", "docs"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "additional-modules", "docs", "README.md"), "# legacy", "utf8");
    const result = runLintInDir(tmp);
    assert.notEqual(result.code, 0);
    assert.ok(result.stderr.includes("legacy-registry.json must exist"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("Phase 7: invalid registry JSON fails", () => {
  const tmp = fs.mkdtempSync(path.join(root, "tmp-p7-neg2-"));
  try {
    fs.mkdirSync(path.join(tmp, "docs"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "docs", "legacy-registry.json"), "{not valid}", "utf8");
    fs.mkdirSync(path.join(tmp, "additional-modules", "docs"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "additional-modules", "docs", "README.md"), "# legacy", "utf8");
    const result = runLintInDir(tmp);
    assert.notEqual(result.code, 0);
    assert.ok(result.stderr.includes("valid JSON") || result.stderr.includes("parse"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("Phase 7: unregistered doc without marker fails", () => {
  const tmp = fs.mkdtempSync(path.join(root, "tmp-p7-neg3-"));
  try {
    const reg = {
      schemaVersion: 1,
      canonicalRoot: "docs/",
      compatibilityRoot: "additional-modules/docs/",
      entries: []
    };
    fs.mkdirSync(path.join(tmp, "docs"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "docs", "legacy-registry.json"), JSON.stringify(reg), "utf8");
    fs.mkdirSync(path.join(tmp, "additional-modules", "docs"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "additional-modules", "docs", "UNREGISTERED.md"), "# unregistered", "utf8");
    const result = runLintInDir(tmp);
    assert.notEqual(result.code, 0);
    assert.ok(result.stderr.includes("not registered"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("Phase 7: invalid entry status fails", () => {
  const tmp = fs.mkdtempSync(path.join(root, "tmp-p7-neg4-"));
  try {
    const reg = {
      schemaVersion: 1,
      canonicalRoot: "docs/",
      compatibilityRoot: "additional-modules/docs/",
      entries: [{ canonical: "test.md", compatibility: "test.md", status: "bad_status" }]
    };
    fs.mkdirSync(path.join(tmp, "docs"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "docs", "legacy-registry.json"), JSON.stringify(reg), "utf8");
    fs.writeFileSync(path.join(tmp, "docs", "test.md"), "# canonical", "utf8");
    fs.mkdirSync(path.join(tmp, "additional-modules", "docs"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "additional-modules", "docs", "test.md"), "# legacy", "utf8");
    const result = runLintInDir(tmp);
    assert.notEqual(result.code, 0);
    assert.ok(result.stderr.includes("status must be one of"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("Phase 7: empty canonical field fails", () => {
  const tmp = fs.mkdtempSync(path.join(root, "tmp-p7-neg5-"));
  try {
    const reg = {
      schemaVersion: 1,
      canonicalRoot: "docs/",
      compatibilityRoot: "additional-modules/docs/",
      entries: [{ canonical: "", compatibility: "test.md", status: "pointer" }]
    };
    fs.mkdirSync(path.join(tmp, "docs"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "docs", "legacy-registry.json"), JSON.stringify(reg), "utf8");
    fs.mkdirSync(path.join(tmp, "additional-modules", "docs"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "additional-modules", "docs", "test.md"), "# legacy", "utf8");
    const result = runLintInDir(tmp);
    assert.notEqual(result.code, 0);
    assert.ok(result.stderr.includes("canonical must be a non-empty string"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
