import { readdirSync, readFileSync, existsSync } from "fs";

import { join, relative, dirname } from "path";

import { fileURLToPath, pathToFileURL } from "url";

import {

  PARENT_MINI_MODULES,

  BACKEND_PARENT_MINI_MODULES,

  BACKEND_MINI_MODULE_INTERNAL_DIRS

} from "../../scripts/lib/parent-mini-modules.config.mjs";

import { extractImportSpecifiers } from "../../scripts/lib/extract-import-specifiers.mjs";

import {

  miniModuleAtPath,

  parseSiblingMiniDeepImport

} from "../../scripts/lib/resolve-module-import.mjs";



const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const frontendModulesDir = join(repoRoot, "frontend/src/modules");

const backendModulesDir = join(repoRoot, "backend/src/modules");



/**

 * Scan parent modules for deep sibling mini-module imports.

 * @returns {Array<{ file: string, specifier: string, targetMini: string }>}

 */

export function findMiniModuleViolations(options = {}) {
  const violations = [];
  if (!options.skipFrontend) {
    violations.push(...scanFrontendMiniModules(options));
  }
  if (!options.skipBackend) {
    violations.push(...scanBackendMiniModules(options));
  }
  return violations;
}



function scanFrontendMiniModules(options = {}) {

  const modulesDir = options.modulesDir ?? frontendModulesDir;

  const violations = [];



  for (const [parentModule, miniModules] of Object.entries(PARENT_MINI_MODULES)) {

    const parentRoot = join(modulesDir, parentModule);

    if (!existsSync(parentRoot)) continue;



    for (const file of walk(parentRoot).filter((f) => /\.(js|jsx|mjs)$/.test(f))) {

      const currentMini = miniModuleAtPath(file, parentModule, miniModules, modulesDir);

      if (!currentMini) continue;



      const source = readFileSync(file, "utf8");

      for (const specifier of extractImportSpecifiers(source)) {

        const deep = parseSiblingMiniDeepImport(specifier, currentMini, miniModules);

        if (deep) {

          violations.push({

            file: relative(repoRoot, file),

            specifier,

            targetMini: deep.targetMini

          });

        }

      }

    }

  }



  return violations;

}



function scanBackendMiniModules(options = {}) {

  const modulesDir = options.backendModulesDir ?? backendModulesDir;

  const violations = [];



  for (const [parentModule, miniModules] of Object.entries(BACKEND_PARENT_MINI_MODULES)) {

    const parentRoot = join(modulesDir, parentModule);

    if (!existsSync(parentRoot)) continue;



    for (const file of walk(parentRoot).filter((f) => /\.(js|mjs)$/.test(f))) {

      const currentMini = miniModuleAtPath(file, parentModule, miniModules, modulesDir);

      if (!currentMini) continue;



      const source = readFileSync(file, "utf8");

      for (const specifier of extractImportSpecifiers(source)) {

        const deep = parseSiblingMiniDeepImport(

          specifier,

          currentMini,

          miniModules,

          BACKEND_MINI_MODULE_INTERNAL_DIRS

        );

        if (deep) {

          violations.push({

            file: relative(repoRoot, file),

            specifier,

            targetMini: deep.targetMini

          });

        }

      }

    }

  }



  return violations;

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

  const violations = findMiniModuleViolations();

  if (violations.length) {

    console.error("Parent mini-module boundary violations found:\n");

    for (const hit of violations) {

      console.error(

        `- ${hit.file} deep-imports ${hit.targetMini} via "${hit.specifier}" (use ../${hit.targetMini} or ../${hit.targetMini}/index.js)`

      );

    }

    process.exit(1);

  }

  console.log("Parent mini-module boundaries OK.");

}



if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {

  main();

}


