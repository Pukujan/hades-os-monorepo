#!/usr/bin/env node
import { access, readFile, readdir } from "fs/promises";
import { join } from "path";
import { artifactPaths, resolvePlanArtifacts } from "./lib/plan-artifacts.mjs";
import { readCliArg } from "./lib/parse-cli-arg.mjs";
import { MANIFEST_FILE, PLANNING_DIR } from "./lib/plan-artifacts.constants.mjs";

const repoRoot = join(import.meta.dirname, "..");
const argv = process.argv.slice(2);
const slug = readCliArg(argv, "--slug");

if (!slug) {
  console.error("Usage: npm run plan:gate -- --slug <plan-slug> [--plan-id <id>]");
  process.exit(1);
}

const errors = [];

async function fileExists(relPath) {
  try {
    await access(join(repoRoot, relPath));
    return true;
  } catch {
    return false;
  }
}

async function loadManifestBySlug(targetSlug) {
  const planningDir = join(repoRoot, PLANNING_DIR);
  let entries;
  try {
    entries = await readdir(planningDir, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestRel = join(PLANNING_DIR, entry.name, MANIFEST_FILE);
    try {
      const raw = await readFile(join(repoRoot, manifestRel), "utf8");
      const parsed = JSON.parse(raw);
      if (parsed.slug === targetSlug) {
        return { manifest: parsed, planId: parsed.planId ?? entry.name };
      }
    } catch {
      /* skip */
    }
  }
  return null;
}

const explicitPlanId = readCliArg(argv, "--plan-id");
let planId = explicitPlanId ?? slug;
let manifest;

if (explicitPlanId) {
  const resolved = await loadManifestBySlug(slug);
  if (resolved && resolved.planId === explicitPlanId) {
    manifest = resolved.manifest;
    planId = resolved.planId;
  } else {
    for (const entry of await readdir(join(repoRoot, PLANNING_DIR), { withFileTypes: true }).catch(
      () => []
    )) {
      if (!entry.isDirectory() || entry.name !== explicitPlanId) continue;
      try {
        const raw = await readFile(
          join(repoRoot, PLANNING_DIR, entry.name, MANIFEST_FILE),
          "utf8"
        );
        manifest = JSON.parse(raw);
        planId = manifest.planId ?? explicitPlanId;
        break;
      } catch {
        /* continue */
      }
    }
    if (!manifest) {
      errors.push(`Missing manifest in work-log/planning/*/${MANIFEST_FILE} for plan-id ${explicitPlanId}`);
    }
  }
} else {
  const resolved = await loadManifestBySlug(slug);
  if (resolved) {
    manifest = resolved.manifest;
    planId = resolved.planId;
  } else {
    errors.push(`No approved manifest for slug ${slug} — run npm run plan:finalize`);
  }
}

if (manifest) {
  if (manifest.status !== "approved") {
    errors.push(`Manifest status is ${manifest.status}, expected approved`);
  }
  if (!manifest.artifacts?.planLogMd) {
    errors.push("Manifest missing artifacts.planLogMd — re-run npm run plan:finalize");
  } else if (!(await fileExists(manifest.artifacts.planLogMd))) {
    errors.push(`Plan log not found: ${manifest.artifacts.planLogMd}`);
  }
  if (!manifest.artifacts?.auditLogMd) {
    errors.push("Manifest missing artifacts.auditLogMd — re-run npm run plan:finalize");
  } else if (!(await fileExists(manifest.artifacts.auditLogMd))) {
    errors.push(`Audit log not found: ${manifest.artifacts.auditLogMd}`);
  }
  if (manifest.artifacts?.designMd && !(await fileExists(manifest.artifacts.designMd))) {
    errors.push(`Design log not found: ${manifest.artifacts.designMd}`);
  }
} else if (!errors.length) {
  const files = await resolvePlanArtifacts(repoRoot, slug);
  const paths = artifactPaths(files);
  if (!paths.planLogMd || !(await fileExists(paths.planLogMd))) {
    errors.push(`Missing plan-log.md in phase folder for slug ${slug}`);
  }
  if (!paths.auditLogMd || !(await fileExists(paths.auditLogMd))) {
    errors.push(`Missing audit-log.md in phase folder for slug ${slug}`);
  }
}

if (errors.length) {
  console.error("Plan gate FAILED:\n", errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(`Plan gate passed for ${planId} (${slug})`);
