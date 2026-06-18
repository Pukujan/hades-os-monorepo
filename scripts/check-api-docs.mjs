#!/usr/bin/env node
/**
 * Ensures every Express route under backend/src/modules is documented in:
 * - docs/<module>/API.md (path + method)
 * - docs/API.md endpoint registry (full path + method)
 */
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const modulesDir = join(repoRoot, "backend/src/modules");
const masterApiPath = join(repoRoot, "docs/API.md");

const SKIP_MODULES = new Set(["_reference"]);
const ROUTE_RE = /router\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/gi;
const BASE_PATH_RE = /app\.use\(\s*["'`](\/api\/[^"'`]+)["'`]/g;

function readText(path) {
  return readFileSync(path, "utf8");
}

function listRouteFiles(moduleDir) {
  const routesDir = join(moduleDir, "routes");
  if (!existsSync(routesDir)) return [];
  return readdirSync(routesDir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => join(routesDir, f));
}

function extractRoutesFromFile(filePath) {
  const content = readText(filePath);
  const routes = [];
  let match;
  ROUTE_RE.lastIndex = 0;
  while ((match = ROUTE_RE.exec(content)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2]
    });
  }
  return routes;
}

function extractBasePaths(moduleDir) {
  const indexPath = join(moduleDir, "index.js");
  if (!existsSync(indexPath)) return [];
  const content = readText(indexPath);
  const paths = [];
  let match;
  BASE_PATH_RE.lastIndex = 0;
  while ((match = BASE_PATH_RE.exec(content)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

function normalizePath(path) {
  return path.replace(/\/+/g, "/");
}

function moduleDocPath(moduleName) {
  return join(repoRoot, "docs", moduleName, "API.md");
}

function pathDocumentedInModuleDoc(docText, method, routePath) {
  const methodOk =
    new RegExp(`\\b${method}\\b`, "i").test(docText) ||
    new RegExp(`\\| ${method} \\|`, "i").test(docText);
  const pathVariants = [
    routePath,
    routePath.replace(/:([A-Za-z0-9_]+)/g, ":$1"),
    `\`${routePath}\``,
    `\`${method} ${routePath}\``,
    `\`${method.toLowerCase()} ${routePath}\``
  ];
  const pathOk = pathVariants.some((p) => docText.includes(p));
  return methodOk && pathOk;
}

function parseRegistryRows(masterText) {
  const start = masterText.indexOf("## Endpoint registry");
  if (start < 0) return [];
  const section = masterText.slice(start);
  const end = section.indexOf("\n## ", 4);
  const body = end >= 0 ? section.slice(0, end) : section;
  const rows = [];
  for (const line of body.split("\n")) {
    if (!line.startsWith("|") || line.includes("---") || line.toLowerCase().includes("method")) {
      continue;
    }
    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cols.length >= 4) {
      rows.push({
        method: cols[0].toUpperCase(),
        fullPath: cols[1].replace(/^`/, "").replace(/`$/, ""),
        module: cols[2],
        description: cols[3]
      });
    }
  }
  return rows;
}

function registryHasRoute(registryRows, method, fullPath) {
  return registryRows.some(
    (r) => r.method === method && normalizePath(r.fullPath) === normalizePath(fullPath)
  );
}

function collectModules() {
  return readdirSync(modulesDir).filter((name) => {
    if (SKIP_MODULES.has(name)) return false;
    const full = join(modulesDir, name);
    return statSync(full).isDirectory() && existsSync(join(full, "index.js"));
  });
}

function main() {
  const errors = [];
  const masterText = readText(masterApiPath);
  const registryRows = parseRegistryRows(masterText);

  if (!masterText.includes("## Endpoint registry")) {
    errors.push("docs/API.md is missing ## Endpoint registry section");
  }

  for (const moduleName of collectModules()) {
    const moduleDir = join(modulesDir, moduleName);
    const basePaths = extractBasePaths(moduleDir);
    if (basePaths.length === 0) {
      errors.push(`${moduleName}: could not read app.use base path from index.js`);
      continue;
    }

    const docPath = moduleDocPath(moduleName);
    if (!existsSync(docPath)) {
      errors.push(`${moduleName}: missing ${docPath.replace(repoRoot + "/", "")}`);
      continue;
    }

    const docText = readText(docPath);
    const routes = [];
    for (const file of listRouteFiles(moduleDir)) {
      routes.push(...extractRoutesFromFile(file));
    }

    for (const { method, path: routePath } of routes) {
      if (!pathDocumentedInModuleDoc(docText, method, routePath)) {
        errors.push(
          `${moduleName}: ${method} ${routePath} not documented in docs/${moduleName}/API.md`
        );
      }

      const matchedInRegistry = basePaths.some((basePath) =>
        registryHasRoute(registryRows, method, normalizePath(`${basePath}${routePath}`))
      );

      if (!matchedInRegistry) {
        const fullPathsStr = basePaths.map((bp) => normalizePath(`${bp}${routePath}`)).join(", ");
        errors.push(
          `${moduleName}: ${method} ${fullPathsStr} missing from docs/API.md Endpoint registry`
        );
      }

      for (const basePath of basePaths) {
        const fullPath = normalizePath(`${basePath}${routePath}`);
        const row = registryRows.find(
          (r) => r.method === method && normalizePath(r.fullPath) === fullPath
        );
        if (row && row.description.length < 8) {
          errors.push(
            `${moduleName}: ${fullPath} registry description too short (min ~8 chars)`
          );
        }
      }
    }
  }

  if (errors.length) {
    console.error("API documentation check failed:\n");
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    console.error("\nSee docs/architecture/API_DOCUMENTATION_CONTRACT.md");
    process.exit(1);
  }

  console.log(`API documentation OK (${registryRows.length} registry rows)`);
}

main();
