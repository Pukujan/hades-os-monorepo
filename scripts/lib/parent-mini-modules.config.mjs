/**
 * Parent workspace modules and their internal mini-modules (frontend).
 * Add entries when you introduce a parent module with mini-modules.
 * `example-workspace` is used by boundary-lint tests only — not a real module folder.
 */
export const PARENT_MINI_MODULES = {
  "example-workspace": ["mini-a", "mini-b"]
};

/**
 * Backend agent mini-modules nested under a parent workspace module.
 * Same barrel-only import rules as frontend PARENT_MINI_MODULES.
 */
export const BACKEND_PARENT_MINI_MODULES = {
  "example-workspace": ["mini-a", "mini-b"]
};

/** @deprecated Use BACKEND_PARENT_MINI_MODULES */
export const BACKEND_AGENT_MODULES = [];

/** Internal layer folder names inside a mini-module (deep imports forbidden from siblings). */
export const MINI_MODULE_INTERNAL_DIRS = new Set([
  "components",
  "services",
  "data",
  "pages",
  "hooks",
  "utils"
]);

/** Backend agent mini-modules may use standard module layers. */
export const BACKEND_MINI_MODULE_INTERNAL_DIRS = new Set([
  ...MINI_MODULE_INTERNAL_DIRS,
  "agents",
  "routes",
  "schemas",
  "prompts",
  "evals",
  "repositories",
  "adapters",
  "domain",
  "events",
  "config"
]);

/** Top-level frontend module pairs allowed to import each other via relative paths. */
export const CROSS_MODULE_ALLOWLIST = [
  { from: "hades", to: "auth" }
];

export function isAllowlistedCrossImport(fromModule, toModule) {
  return CROSS_MODULE_ALLOWLIST.some((e) => e.from === fromModule && e.to === toModule);
}
