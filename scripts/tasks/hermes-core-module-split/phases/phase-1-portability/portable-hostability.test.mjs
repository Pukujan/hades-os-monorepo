import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");

const scannedRoots = [
  "backend/src/core",
  "backend/src/shared",
  "backend/src/modules/auth",
  "frontend/src/core",
  "frontend/src/shared",
  "frontend/src/auth",
];

const deployRequiredFiles = [
  "railway.toml",
  "vercel.json",
  "frontend/vercel.json",
  "backend/Dockerfile",
  "backend/.dockerignore",
  "backend/.env.example",
  "frontend/.env.example",
  "docs/DEPLOY.md",
  "additional-modules/docs/DEPLOY.md",
  "scripts/lint-deploy.mjs",
  "scripts/lint-deploy.test.mjs",
  "backend/src/shared/contracts/monorepoDeploy.contract.js",
  "docs/architecture/contracts/monorepoDeploy.contract.md",
];

const deployForbiddenFiles = [
  "backend/vercel.json",
  "frontend/railway.toml",
];

const portableForbiddenStrings = [
  "/Users/teresaguajardo",
  "Hades OS",
  "/tmp/hades-hermes",
  "/app/forge",
  "/app/minions",
  "/api/hades",
  "hades.auth.accessToken",
];

const sourceExtensions = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".json",
  ".md",
]);

function extensionFor(filePath) {
  const name = filePath.split(/[\\/]/).pop() || "";
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot) : "";
}

function walkFiles(rootRel) {
  const root = join(repoRoot, rootRel);
  if (!existsSync(root)) return [];

  const files = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "build") {
        continue;
      }
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (sourceExtensions.has(extensionFor(full))) {
        files.push(full);
      }
    }
  };

  visit(root);
  return files;
}

function readScannedSources() {
  return scannedRoots.flatMap((root) =>
    walkFiles(root).map((file) => ({
      file,
      rel: relative(repoRoot, file),
      source: readFileSync(file, "utf8"),
    }))
  );
}

test("portable deploy artifacts are present and platform-specific configs are absent", () => {
  for (const rel of deployRequiredFiles) {
    assert.equal(existsSync(join(repoRoot, rel)), true, `missing required deploy artifact: ${rel}`);
  }

  for (const rel of deployForbiddenFiles) {
    assert.equal(existsSync(join(repoRoot, rel)), false, `forbidden deploy artifact exists: ${rel}`);
  }
});

test("core, shared, and auth layers do not import Hades product modules", () => {
  const violations = [];
  const hadesModulePatterns = [
    /from\s+["'][^"']*modules\/hades[^"']*["']/,
    /import\s*\(\s*["'][^"']*modules\/hades[^"']*["']\s*\)/,
    /from\s+["'][^"']*\.\.\/modules\/hades[^"']*["']/,
    /import\s*\(\s*["'][^"']*\.\.\/modules\/hades[^"']*["']\s*\)/,
    /from\s+["'][^"']*\.\.\/\.\.\/modules\/hades[^"']*["']/,
    /import\s*\(\s*["'][^"']*\.\.\/\.\.\/modules\/hades[^"']*["']\s*\)/,
    /from\s+["'][^"']*\/hades\/[^"']*["']/,
    /import\s*\(\s*["'][^"']*\/hades\/[^"']*["']\s*\)/,
  ];

  for (const { rel, source } of readScannedSources()) {
    for (const pattern of hadesModulePatterns) {
      if (pattern.test(source)) {
        violations.push(`${rel} matches ${pattern}`);
        break;
      }
    }
  }

  assert.deepEqual(violations, [], `core/shared/auth must not import Hades modules:\n${violations.join("\n")}`);
});

test("core, shared, and auth layers do not contain non-portable product/runtime strings", () => {
  const violations = [];

  for (const { rel, source } of readScannedSources()) {
    for (const forbidden of portableForbiddenStrings) {
      if (source.includes(forbidden)) {
        violations.push(`${rel} contains ${JSON.stringify(forbidden)}`);
      }
    }
  }

  assert.deepEqual(violations, [], `portable core/shared/auth violations:\n${violations.join("\n")}`);
});
