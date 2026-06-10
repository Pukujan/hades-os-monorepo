import { dirname, join, normalize, relative } from "path";
import { MINI_MODULE_INTERNAL_DIRS } from "./parent-mini-modules.config.mjs";

/**
 * Resolve a relative import from a file to an absolute normalized path.
 * Returns null for non-relative specifiers.
 */
export function resolveRelativeImport(filePath, specifier) {
  if (!specifier.startsWith(".")) return null;
  return normalize(join(dirname(filePath), specifier));
}

/**
 * Return top-level module folder name if resolvedPath is under modulesDir/<name>/.
 */
export function moduleAtPath(resolvedPath, modulesDir) {
  const normalized = normalize(resolvedPath);
  const rel = relative(normalize(modulesDir), normalized);
  if (rel.startsWith("..") || rel === "") return null;
  const segment = rel.split(/[/\\]/)[0];
  return segment || null;
}

/**
 * For a file under modules/<parent>/, return mini-module name if file is inside one.
 */
export function miniModuleAtPath(filePath, parentModule, miniModules, modulesDir) {
  const parentRoot = normalize(join(modulesDir, parentModule));
  const normalized = normalize(filePath);
  const rel = relative(parentRoot, normalized);
  if (rel.startsWith("..") || rel === "") return null;

  const firstSegment = rel.split(/[/\\]/)[0];
  if (miniModules.includes(firstSegment)) {
    return firstSegment;
  }
  return null;
}

/**
 * For backend agent mini-modules under modules/<parent>/agents/<agent-id>/.
 */
export function backendAgentMiniModuleAtPath(filePath, parentModule, agentIds, modulesDir) {
  const agentsRoot = normalize(join(modulesDir, parentModule, "agents"));
  const normalized = normalize(filePath);
  const rel = relative(agentsRoot, normalized);
  if (rel.startsWith("..") || rel === "") return null;

  const firstSegment = rel.split(/[/\\]/)[0];
  if (agentIds.includes(firstSegment)) {
    return firstSegment;
  }
  return null;
}

/**
 * Parse sibling mini-module deep import (supports ../ and ../../ prefixes).
 * Returns { targetMini, internalSegment } or null if not a deep sibling import.
 * @param {Set<string>} [internalDirs]
 */
export function parseSiblingMiniDeepImport(
  specifier,
  currentMini,
  miniModules,
  internalDirs = MINI_MODULE_INTERNAL_DIRS
) {
  if (!specifier.startsWith(".")) return null;

  const parts = specifier.split("/").filter(Boolean);
  let targetIndex = -1;

  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i] === "." || parts[i] === "..") continue;
    if (miniModules.includes(parts[i]) && parts[i] !== currentMini) {
      targetIndex = i;
      break;
    }
    if (!parts[i].startsWith(".")) break;
  }

  if (targetIndex === -1) return null;

  const targetMini = parts[targetIndex];
  const next = parts[targetIndex + 1];
  if (next && internalDirs.has(next)) {
    return { targetMini, internalSegment: next };
  }

  return null;
}

export { MINI_MODULE_INTERNAL_DIRS };
