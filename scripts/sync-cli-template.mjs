#!/usr/bin/env node
/**
 * Copies the v2 starter into packages/create-modular-monolith/template
 * for publishing with the npm CLI.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

const root = new URL("../", import.meta.url).pathname;
const target = join(root, "packages/create-modular-monolith/template");

const COPY_ROOTS = ["backend", "frontend", "docs", "scripts", "README.md", ".gitignore", "package.json"];

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "packages"
]);

if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
}
mkdirSync(target, { recursive: true });

for (const item of COPY_ROOTS) {
  const src = join(root, item);
  if (!existsSync(src)) {
    console.warn(`Skip missing: ${item}`);
    continue;
  }
  const dest = join(target, item);
  cpSync(src, dest, {
    recursive: true,
    filter: (sourcePath) => {
      const parts = sourcePath.split(/[/\\]/);
      return !parts.some((part) => EXCLUDE_DIRS.has(part));
    }
  });
  console.log(`✓ ${item}`);
}

console.log(`\nTemplate synced to ${target}`);
