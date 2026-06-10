export const PLANNING_PHASE_VERSION = "v003";
export const STUDY_DOCS_DIR = "work-log/study-docs";
export const PLANNING_DIR = "work-log/planning";

export const PLAN_LOG_FILE = "plan-log.md";
export const AUDIT_LOG_FILE = "audit-log.md";
export const DESIGN_LOG_FILE = "design-log.md";
export const MANIFEST_FILE = "manifest.json";

export const PLANNING_STATUSES = ["draft", "approved", "executing", "done"];

/** Phase folder name: {NNN}_{YYYY-MM-DD}_{HH-MM}_{slug} */
export function planPhaseFolderPattern(slug) {
  return `*_*_*_${slug}`;
}

export function designFilenamePattern(slug) {
  return `*_design_${slug}*.md`;
}

export function planningManifestPath(phaseDir) {
  return `${phaseDir}/${MANIFEST_FILE}`;
}

export function artifactLocations() {
  return {
    studyLogMd: STUDY_DOCS_DIR,
    phaseDir: PLANNING_DIR,
    planLogMd: PLANNING_DIR,
    auditLogMd: PLANNING_DIR,
    designMd: PLANNING_DIR,
    manifestJson: PLANNING_DIR
  };
}
