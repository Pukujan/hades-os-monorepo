#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.env.LINT_ROOT || process.cwd();

const VALID_STATUSES = new Set(["pointer", "generated", "legacy", "redirect", "orphaned"]);
const POINTER_GENERATED_MARKER = /<!--\s*(pointer|generated)\s*-->/i;

let exitCode = 0;
const errors = [];
let registry = null;

function resolve(rel) {
  return path.join(root, rel);
}

function exists(rel) {
  return fs.existsSync(resolve(rel));
}

function check(predicate, msg) {
  if (!predicate) {
    errors.push(msg);
    exitCode = 1;
  }
}

check(exists("docs"), "docs/ directory must exist");

if (exists("docs/DEPLOY.md")) {
  try {
    fs.readFileSync(resolve("docs/DEPLOY.md"), "utf8");
  } catch {
    check(false, "docs/DEPLOY.md must be readable");
  }
}

if (exists("additional-modules/docs") && exists("additional-modules/docs/DEPLOY.md")) {
  try {
    const content = fs.readFileSync(resolve("additional-modules/docs/DEPLOY.md"), "utf8");
    const hasCanonicalRef = /docs\/DEPLOY\.md|canonical|pointer|generated|legacy/i.test(content);
    check(hasCanonicalRef, "additional-modules/docs/DEPLOY.md must reference docs/DEPLOY.md, canonical, pointer, generated, or legacy");
  } catch {
    check(false, "additional-modules/docs/DEPLOY.md must be readable");
  }
}

if (!exists("docs/legacy-registry.json")) {
  check(false, "docs/legacy-registry.json must exist");
} else {
  try {
    registry = JSON.parse(fs.readFileSync(resolve("docs/legacy-registry.json"), "utf8"));
  } catch {
    check(false, "docs/legacy-registry.json must be valid JSON");
    registry = null;
  }

  if (registry && typeof registry === "object") {
    check(typeof registry.schemaVersion === "number", "legacy-registry.schemaVersion must be a number");
    check(typeof registry.canonicalRoot === "string" && registry.canonicalRoot.length > 0, "legacy-registry.canonicalRoot must be a non-empty string");
    check(typeof registry.compatibilityRoot === "string" && registry.compatibilityRoot.length > 0, "legacy-registry.compatibilityRoot must be a non-empty string");
    check(Array.isArray(registry.entries), "legacy-registry.entries must be an array");

    for (const [i, entry] of (registry.entries || []).entries()) {
      check(typeof entry === "object" && entry !== null, `legacy-registry.entries[${i}] must be an object`);
      if (entry && typeof entry === "object") {
        check(typeof entry.canonical === "string" && entry.canonical.length > 0, `legacy-registry.entries[${i}].canonical must be a non-empty string`);
        check(typeof entry.compatibility === "string" && entry.compatibility.length > 0, `legacy-registry.entries[${i}].compatibility must be a non-empty string`);
        check(VALID_STATUSES.has(entry.status), `legacy-registry.entries[${i}].status must be one of: ${Array.from(VALID_STATUSES).join(", ")}`);
      }
    }
  }
}

if (exists("additional-modules/docs")) {
  const compatDir = resolve("additional-modules/docs");
  const walkFiles = (dir) => {
    let result = [];
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          result = result.concat(walkFiles(full));
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          result.push(full);
        }
      }
    } catch {
      // skip unreadable dirs
    }
    return result;
  };

  const mdFiles = walkFiles(compatDir);
  const compatRoot = resolve("additional-modules/docs");
  const registryPaths = new Set(
    (registry && Array.isArray(registry.entries) ? registry.entries : []).map((e) => e.compatibility)
  );

  for (const filePath of mdFiles) {
    const relPath = path.relative(compatRoot, filePath);
    const content = fs.readFileSync(filePath, "utf8");
    const hasMarker = POINTER_GENERATED_MARKER.test(content);
    if (hasMarker) continue;
    check(
      registryPaths.has(relPath),
      `additional-modules/docs/${relPath} is not registered in legacy-registry.json and has no pointer/generated marker`
    );
  }
}

for (const err of errors) {
  console.error(err);
}
process.exit(exitCode);
