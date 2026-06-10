/** Shared path constants for plan scripts (mirrors planningPhase.contract.js). */

export const STUDY_DOCS_DIR = "work-log/study-docs";
export const PLANNING_DIR = "work-log/planning";

export const PLAN_LOG_FILE = "plan-log.md";
export const AUDIT_LOG_FILE = "audit-log.md";
export const DESIGN_LOG_FILE = "design-log.md";
export const MANIFEST_FILE = "manifest.json";

/** Phase folder: {NNN}_{YYYY-MM-DD}_{HH-MM}_{slug} */
export function phaseFolderPattern(slug) {
  return new RegExp(`_${slug.replace(/-/g, "\\-")}$`);
}

export function DESIGN_FILENAME_PATTERN(slug) {
  return new RegExp(`_design_${slug}`);
}
