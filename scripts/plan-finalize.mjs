#!/usr/bin/env node
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { artifactPaths, resolvePlanArtifacts } from "./lib/plan-artifacts.mjs";
import { readCliArg } from "./lib/parse-cli-arg.mjs";

const repoRoot = join(import.meta.dirname, "..");
const argv = process.argv.slice(2);
const slug = readCliArg(argv, "--slug");

if (!slug) {
  console.error("Usage: npm run plan:finalize -- --slug <plan-slug> [--plan-id <id>]");
  process.exit(1);
}

const planId = readCliArg(argv, "--plan-id") ?? slug;

const files = await resolvePlanArtifacts(repoRoot, slug);
const paths = artifactPaths(files);

const missing = [];
if (!paths.phaseDir) {
  missing.push(`phase folder (work-log/planning/{NNN}_{date}_{time}_${slug}/)`);
}
if (!paths.planLogMd) {
  missing.push(`plan-log.md in phase folder`);
}
if (!paths.auditLogMd) {
  missing.push(`audit-log.md in phase folder`);
}

if (missing.length) {
  console.error(`Cannot finalize — missing:\n  - ${missing.join("\n  - ")}`);
  console.error(
    "\nCreate work-log/planning/{NNN}_{YYYY-MM-DD}_{HH-MM}_{slug}/ with plan-log.md + audit-log.md. Study logs are user-only — not required for finalize."
  );
  process.exit(1);
}

const artifacts = {
  phaseDir: paths.phaseDir,
  planLogMd: paths.planLogMd,
  auditLogMd: paths.auditLogMd
};
if (paths.designMd) artifacts.designMd = paths.designMd;

const manifest = {
  planId,
  slug,
  status: "approved",
  finalizedAt: new Date().toISOString(),
  artifacts
};

const manifestPath = join(repoRoot, paths.phaseDir, "manifest.json");
await mkdir(join(repoRoot, paths.phaseDir), { recursive: true });
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Wrote ${paths.phaseDir}/manifest.json`);
console.log(`  plan:  ${paths.planLogMd}`);
console.log(`  audit: ${paths.auditLogMd}`);
console.log(`  design:${paths.designMd ?? " (none)"}`);
