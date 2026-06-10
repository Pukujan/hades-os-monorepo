/** @readonly Pre-push dev log contract (human MD + agent JSON). */

export const PRE_PUSH_DEV_LOG_VERSION = "v001";
export const DEV_LOG_AGENT_SCHEMA_VERSION = "1.0.0";

export const DEV_LOG_HUMAN_DIR = "work-log/dev-logs/human";
export const DEV_LOG_AGENT_DIR = "work-log/dev-logs/agent";
export const DEV_LOG_AGENT_SCHEMA = "work-log/dev-logs/schemas/dev-log-agent.v1.schema.json";
export const DEV_LOG_HUMAN_FORMAT = "scripts/lib/dev-log-human-format.mjs";

export const DEV_LOG_GENERATOR_SCRIPT = "scripts/write-pre-push-dev-log.mjs";
export const DEV_LOG_VERIFY_SCRIPT = "scripts/verify-dev-log.mjs";
export const DEV_LOG_API_INVENTORY_SCRIPT = "scripts/lib/api-inventory.mjs";
export const DEV_LOG_REPO_TREE_SCRIPT = "scripts/lib/repo-tree.mjs";

/** Same as `tree -I "node_modules|.git|dist|build"`. */
export const DEV_LOG_TREE_IGNORE_DIRS = ["node_modules", ".git", "dist", "build", ".DS_Store"];

/** Filename patterns (paired by `{NNN}_{date}_{time}` prefix). */
export const DEV_LOG_HUMAN_FILENAME_PATTERN =
  "{NNN}_{YYYY-MM-DD}_{HH-MM}_dev-log_{slug}.md";
export const DEV_LOG_AGENT_FILENAME_PATTERN =
  "{NNN}_{YYYY-MM-DD}_{HH-MM}_dev-log-agent_{slug}.json";

export const DEV_LOG_NPM_SCRIPTS = {
  prePush: "dev-log:pre-push",
  verify: "dev-log:verify"
};
