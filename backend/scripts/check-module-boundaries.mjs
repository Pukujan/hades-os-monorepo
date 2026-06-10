import { readdirSync, readFileSync, existsSync } from "fs";
import { join, relative, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { isAllowlistedCrossImport } from "../../scripts/lib/parent-mini-modules.config.mjs";
import { extractImportSpecifiers } from "../../scripts/lib/extract-import-specifiers.mjs";
import {
  resolveRelativeImport,
  moduleAtPath
} from "../../scripts/lib/resolve-module-import.mjs";

const apps = [
  { name: "backend", root: join(dirname(fileURLToPath(import.meta.url)), "../"), modulesSubpath: "src/modules" },
  {
    name: "frontend",
    root: join(dirname(fileURLToPath(import.meta.url)), "../../frontend/"),
    modulesSubpath: "src/modules"
  }
];

/**
 * @returns {Array<{ app: string, file: string, moduleName: string, other: string, rule: string, detail: string }>}
 */
export function findModuleBoundaryViolations(options = {}) {
  const appConfigs = options.apps ?? apps;
  const forbidden = [];

  for (const app of appConfigs) {
    const modulesDir = join(app.root, app.modulesSubpath);
    if (!existsSync(modulesDir)) continue;

    const moduleNames = readdirSync(modulesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .filter((d) => !d.name.startsWith("."))
      .map((d) => d.name);

    for (const moduleName of moduleNames) {
      if (moduleName === "model-condenser") continue;

      const moduleRoot = join(modulesDir, moduleName);
      const files = walk(moduleRoot).filter((f) =>
        [".js", ".mjs", ".jsx"].some((ext) => f.endsWith(ext))
      );

      for (const file of files) {
        const source = readFileSync(file, "utf8");

        for (const other of moduleNames) {
          if (other === moduleName) continue;
          const needle = `/modules/${other}/`;
          if (source.includes(needle)) {
            forbidden.push({
              app: app.name,
              file: relative(app.root, file),
              moduleName,
              other,
              rule: "absolute-path-string",
              detail: needle
            });
          }
        }

        if (app.name === "frontend") {
          for (const specifier of extractImportSpecifiers(source)) {
            const resolved = resolveRelativeImport(file, specifier);
            if (!resolved) continue;

            const targetModule = moduleAtPath(resolved, modulesDir);
            if (!targetModule || targetModule === moduleName) continue;

            if (!isAllowlistedCrossImport(moduleName, targetModule)) {
              forbidden.push({
                app: app.name,
                file: relative(app.root, file),
                moduleName,
                other: targetModule,
                rule: "relative-cross-module",
                detail: specifier
              });
            }
          }
        }
      }
    }
  }

  return forbidden;
}

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function main() {
  const forbidden = findModuleBoundaryViolations();
  if (forbidden.length) {
    console.error("Module boundary violations found:\n");
    for (const hit of forbidden) {
      if (hit.rule === "relative-cross-module") {
        console.error(
          `- [${hit.app}] ${hit.file} imports ${hit.other} via "${hit.detail}" (not allowlisted)`
        );
      } else {
        console.error(`- [${hit.app}] ${hit.file} references cross-module path (${hit.detail})`);
      }
    }
    process.exit(1);
  }
  console.log("Module boundaries OK.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
