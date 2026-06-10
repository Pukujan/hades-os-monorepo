/** @readonly Architecture push dev log (npm / create-modular-monolith exports). */

export const ARCHITECTURE_PUSH_DEV_LOG_VERSION = "v001";
export const ARCH_PUSH_AGENT_SCHEMA_VERSION = "1.0.0";

export const ARCH_PUSH_HUMAN_DIR = "work-log/architecture-push-logs/human";
export const ARCH_PUSH_AGENT_DIR = "work-log/architecture-push-logs/agent";
export const ARCH_PUSH_AGENT_SCHEMA =
  "work-log/architecture-push-logs/schemas/arch-push-agent.v1.schema.json";

export const ARCH_PUSH_GENERATOR_SCRIPT = "scripts/write-architecture-push-log.mjs";
export const ARCH_PUSH_VERIFY_SCRIPT = "scripts/verify-architecture-push-log.mjs";
export const ARCH_PUSH_HUMAN_FORMAT = "scripts/lib/arch-push-human-format.mjs";

export const ARCH_PUSH_DEFAULT_TARGET_REPO =
  "https://github.com/Pukujan/create-modular-monolith";
export const ARCH_PUSH_DEFAULT_NPM_PACKAGE = "@pukujan/create-modular-monolith";

/** Filename patterns (paired by `{NNN}_{date}_{time}` prefix). */
export const ARCH_PUSH_HUMAN_FILENAME_PATTERN =
  "{NNN}_{YYYY-MM-DD}_{HH-MM}_arch-push_{slug}.md";
export const ARCH_PUSH_AGENT_FILENAME_PATTERN =
  "{NNN}_{YYYY-MM-DD}_{HH-MM}_arch-push-agent_{slug}.json";

export const ARCH_PUSH_NPM_SCRIPTS = {
  push: "arch-log:push",
  verify: "arch-log:verify"
};
