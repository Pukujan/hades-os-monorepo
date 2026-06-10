/**
 * @param {string} label
 * @param {string} detail
 */
export function logModuleLoaded(label, detail = "") {
  console.log(detail ? `✓ ${label} — ${detail}` : `✓ ${label}`);
}

/**
 * @param {string} parent
 * @param {Array<{ id: string, role?: string, mount?: string }>} children
 */
export function logChildModules(parent, children) {
  if (!children.length) return;
  console.log(`  [${parent}]`);
  for (const child of children) {
    const parts = [child.id];
    if (child.role) parts.push(child.role);
    if (child.mount) parts.push(`→ ${child.mount}`);
    console.log(`    • ${parts.join(" — ")}`);
  }
}

/**
 * @param {Array<{ name: string, detail?: string, children?: Array<{ id: string, role?: string, mount?: string }> }>} modules
 * @param {number | string} port
 */
export function logStartupSummary(modules, port) {
  console.log("\n── Backend modules in use ──");
  for (const mod of modules) {
    logModuleLoaded(mod.name, mod.detail);
    if (mod.children?.length) {
      logChildModules(mod.name, mod.children);
    }
  }
  console.log(`\nBackend running on port ${port}\n`);
}
