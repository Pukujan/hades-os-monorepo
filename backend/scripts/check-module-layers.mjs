import { readdirSync, readFileSync, existsSync } from "fs";
import { join, relative, dirname } from "path";
import { fileURLToPath } from "url";
import { BACKEND_PARENT_MINI_MODULES } from "../../scripts/lib/parent-mini-modules.config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const modulesDir = join(root, "src/modules");

const LAYERS = [
  "routes",
  "services",
  "repositories",
  "adapters",
  "domain",
  "agents",
  "events",
  "prompts",
  "evals",
  "schemas",
  "utils",
  "config"
];

const FORBIDDEN_IMPORTS = {
  domain: ["services", "routes", "repositories", "adapters", "agents", "events", "prompts", "evals"],
  routes: ["repositories", "adapters", "domain", "agents", "events", "prompts", "evals"],
  repositories: ["services", "routes", "agents", "events", "evals", "prompts"],
  prompts: ["services", "routes", "repositories", "adapters", "agents", "events", "evals"],
  utils: ["services", "routes", "repositories", "adapters", "domain", "agents", "events", "prompts", "evals"],
  schemas: ["services", "routes", "repositories", "adapters", "domain", "agents", "events", "evals", "prompts"],
  adapters: ["services", "routes", "agents", "events", "evals", "prompts"],
  agents: ["services", "routes", "repositories", "adapters", "domain", "events", "evals", "prompts"],
  events: ["routes", "repositories", "adapters", "agents", "prompts", "evals"],
  evals: ["routes", "events", "repositories", "adapters", "agents"],
  config: ["routes", "services", "repositories", "adapters", "domain", "agents", "events", "prompts", "evals"]
};

if (!existsSync(modulesDir)) {
  console.log("No modules directory found. Skipping.");
  process.exit(0);
}

const moduleNames = readdirSync(modulesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .filter((d) => !d.name.startsWith("_"))
  .map((d) => d.name);

/** @type {Array<{ label: string, root: string, excludeSubdirs?: Set<string> }>} */
const scanTargets = [];
for (const moduleName of moduleNames) {
  const moduleRoot = join(modulesDir, moduleName);
  const miniModules = BACKEND_PARENT_MINI_MODULES[moduleName] ?? [];
  scanTargets.push({
    label: moduleName,
    root: moduleRoot,
    excludeSubdirs: miniModules.length ? new Set(miniModules) : undefined
  });
  for (const mini of miniModules) {
    scanTargets.push({ label: `${moduleName}/${mini}`, root: join(moduleRoot, mini) });
  }
}

const violations = [];

for (const target of scanTargets) {
  const moduleRoot = target.root;
  const files = walk(moduleRoot, target.excludeSubdirs).filter((f) => {
    if (f.includes("/tests/") || f.includes("\\tests\\")) return false;
    if (f.endsWith(".test.js") || f.endsWith(".test.mjs")) return false;
    return f.endsWith(".js") || f.endsWith(".mjs");
  });

  for (const file of files) {
    const fromLayer = layerForFile(file, moduleRoot);
    if (!fromLayer || fromLayer === "index") continue;

    const forbidden = FORBIDDEN_IMPORTS[fromLayer];
    if (!forbidden) continue;

    const source = readFileSync(file, "utf8");
    const imports = extractRelativeImports(source);

    for (const imp of imports) {
      const toLayer = layerForImportPath(imp, file, moduleRoot);
      if (!toLayer) continue;
      if (forbidden.includes(toLayer)) {
        violations.push({
          file: relative(root, file),
          fromLayer,
          toLayer,
          importPath: imp
        });
      }
    }
  }
}

if (violations.length) {
  console.error("Module layer violations found:\n");
  for (const hit of violations) {
    console.error(
      `- ${hit.file} (${hit.fromLayer}) must not import ${hit.toLayer} via "${hit.importPath}"`
    );
  }
  console.error("\nSee docs/architecture/MODULE_INTERNAL_CONTRACT.md");
  process.exit(1);
}

console.log("Module layers OK.");

function layerForFile(filePath, moduleRoot) {
  const rel = relative(moduleRoot, filePath);
  if (rel === "index.js") return "index";
  const parts = rel.split(/[/\\]/);
  if (parts[0] === "agents" && parts.length === 3 && parts[2] === "index.js") {
    return "index";
  }
  if (parts[0] === "agents" && parts.length >= 3 && LAYERS.includes(parts[2])) {
    return parts[2];
  }
  const segment = parts[0];
  return LAYERS.includes(segment) ? segment : null;
}

function layerForImportPath(importPath, fromFile, moduleRoot) {
  const fromDir = join(fromFile, "..");
  let resolved = importPath.startsWith(".")
    ? join(fromDir, importPath)
    : null;

  if (!resolved) {
    for (const layer of LAYERS) {
      if (
        importPath.includes(`/${layer}/`) ||
        importPath.startsWith(`${layer}/`) ||
        importPath.includes(`../${layer}/`)
      ) {
        return layer;
      }
    }
    return null;
  }

  if (!resolved.endsWith(".js") && !resolved.endsWith(".mjs")) {
    resolved += ".js";
  }

  const rel = relative(moduleRoot, resolved);
  const parts = rel.split(/[/\\]/);
  if (parts[0] === "agents" && parts.length === 3 && parts[2] === "index.js") {
    return "index";
  }
  if (parts[0] === "agents" && parts.length >= 3 && LAYERS.includes(parts[2])) {
    return parts[2];
  }
  const segment = parts[0];
  return LAYERS.includes(segment) ? segment : null;
}

function extractRelativeImports(source) {
  const imports = [];
  const patterns = [
    /from\s+["'](\.[^"']+)["']/g,
    /import\s*\(\s*["'](\.[^"']+)["']\s*\)/g,
    /require\s*\(\s*["'](\.[^"']+)["']\s*\)/g
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      imports.push(match[1]);
    }
  }
  return imports;
}

function walk(dir, excludeSubdirs) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && excludeSubdirs?.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}
