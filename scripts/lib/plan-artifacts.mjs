import { readdir } from "fs/promises";
import { join } from "path";
import {
  AUDIT_LOG_FILE,
  DESIGN_LOG_FILE,
  MANIFEST_FILE,
  PLANNING_DIR,
  PLAN_LOG_FILE,
  phaseFolderPattern
} from "./plan-artifacts.constants.mjs";

function toPosix(p) {
  return p.replace(/\\/g, "/");
}

/**
 * Find the latest phase folder for a slug under work-log/planning/.
 * @param {string} repoRoot
 * @param {string} slug
 */
export async function resolvePlanPhaseDir(repoRoot, slug) {
  const planningDir = join(repoRoot, PLANNING_DIR);
  let entries;
  try {
    entries = await readdir(planningDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const pattern = phaseFolderPattern(slug);
  const dirs = entries
    .filter((e) => e.isDirectory() && pattern.test(e.name))
    .map((e) => e.name)
    .sort()
    .reverse();

  if (dirs.length === 0) return null;
  return toPosix(join(PLANNING_DIR, dirs[0]));
}

/**
 * Resolve plan + audit logs for a slug (agent planning workflow).
 * @param {string} repoRoot
 * @param {string} slug
 */
export async function resolvePlanArtifacts(repoRoot, slug) {
  const phaseDir = await resolvePlanPhaseDir(repoRoot, slug);
  if (!phaseDir) {
    return { phaseDir: null, planLogMd: null, auditLogMd: null, designMd: null };
  }

  const planningEntries = await readdir(join(repoRoot, phaseDir)).catch(() => []);
  const designFile = planningEntries.find(
    (f) => f === DESIGN_LOG_FILE || (f.endsWith(".md") && f.includes("design"))
  );

  return {
    phaseDir,
    planLogMd: toPosix(join(phaseDir, PLAN_LOG_FILE)),
    auditLogMd: toPosix(join(phaseDir, AUDIT_LOG_FILE)),
    designMd: designFile ? toPosix(join(phaseDir, designFile)) : null,
    manifestJson: toPosix(join(phaseDir, MANIFEST_FILE))
  };
}

export function artifactPaths(files) {
  return {
    phaseDir: files.phaseDir,
    planLogMd: files.planLogMd,
    auditLogMd: files.auditLogMd,
    designMd: files.designMd ?? null,
    manifestJson: files.manifestJson ?? null
  };
}

export { PLANNING_DIR };
