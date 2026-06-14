import { readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getEventBus } from "../shared/events/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @typedef {{ name: string, detail?: string, children?: Array<{ id: string, role?: string, mount?: string }> }} LoadedModule
 */

export async function loadModules(app, overrides = {}) {
  const modulesDir = join(__dirname, "../modules");
  /** @type {LoadedModule[]} */
  const loaded = [];
  if (!existsSync(modulesDir)) return loaded;

  const moduleContext = { eventBus: getEventBus(), overrides };
  const names = readdirSync(modulesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => !d.name.startsWith("_"))
    .filter((d) => !d.name.startsWith("."))
    .map((d) => d.name);

  const ordered = [...names].sort();

  console.log(`\nLoading ${ordered.length} backend module(s)...`);

  for (const name of ordered) {
    const moduleEntry = join(modulesDir, name, "index.js");
    if (!existsSync(moduleEntry)) {
      console.warn(`! Module ignored (no index.js): ${name}`);
      continue;
    }

    try {
      const mod = await import(`../modules/${name}/index.js`);
      if (typeof mod.register !== "function") {
        console.warn(`! Module ignored (missing register): ${name}`);
        continue;
      }

      const info = await mod.register(app, moduleContext);
      if (info?.skipped) {
        console.warn(`⊘ Module skipped: ${name}${info.reason ? ` — ${info.reason}` : ""}`);
        continue;
      }

      loaded.push({
        name,
        detail: info?.detail,
        children: info?.children
      });
    } catch (error) {
      console.error(`✗ Module failed: ${name} —`, error.message);
    }
  }

  return loaded;
}
