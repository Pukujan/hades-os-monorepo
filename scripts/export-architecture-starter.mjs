#!/usr/bin/env node
/**
 * Export architecture-only starter (no domain modules, no node_modules/dist/build).
 *
 * Usage:
 *   npm run export:architecture-starter
 *   npm run export:architecture-starter -- --to packages/create-modular-monolith/template
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from "fs";
import { join, dirname, resolve, isAbsolute, relative } from "path";
import { fileURLToPath } from "url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
export const ARCHITECTURE_TEMPLATES_DIR = "file-exchange/exports/templates";
export const ARCHITECTURE_EXPORT_OUTPUT_DIR = "file-exchange/exports/architecture-starter";

const templatesRoot = join(repoRoot, ARCHITECTURE_TEMPLATES_DIR);

function resolveTemplate(rel, fallbackRel) {
  const primary = join(templatesRoot, rel);
  if (existsSync(primary)) return primary;
  if (fallbackRel) {
    const fallback = join(repoRoot, fallbackRel);
    if (existsSync(fallback)) return fallback;
  }
  return null;
}

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  "packages",
  "data",
  "eval-bundles",
  "case-exports",
  "evals"
]);

/** Generated or maintainer-only paths under file-exchange/exports (not part of product copy). */
const EXPORT_SKIP_PREFIXES = [
  ARCHITECTURE_EXPORT_OUTPUT_DIR,
  ARCHITECTURE_TEMPLATES_DIR
];

const BACKEND_MODULES_KEEP = new Set(["_reference", "model-condenser"]);
const FRONTEND_MODULES_KEEP = new Set(["_reference"]);

const SCRIPTS_KEEP = new Set([
  "new-module.mjs",
  "sync-cli-template.mjs",
  "export-architecture-starter.mjs",
  "check-api-docs.mjs",
  "lint-contracts.mjs",
  "lint-repo-artifacts.mjs",
  "condense-models.mjs",
  "condense-prompts.mjs",
  "condense-file-structure.mjs",
  "condense-all.mjs",
  "consolidated-output.mjs",
  "write-pre-push-dev-log.mjs",
  "verify-dev-log.mjs",
  "plan-finalize.mjs",
  "plan-gate.mjs",
  "lint-pipeline-agent-mini-modules.mjs",
  "import-to-file-exchange.mjs",
  "resolve-import-stamp.mjs",
  "export-consolidated-models.mjs",
  "run-module-evals.mjs"
]);

const DOCS_KEEP_FILES = new Set([
  "README.md",
  "STARTER_PACK.md",
  "PUBLISHING.md",
  "DEVLOG_V2.md"
]);

function parseArgs(argv) {
  let target = join(repoRoot, ARCHITECTURE_EXPORT_OUTPUT_DIR);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--to" && argv[i + 1]) {
      const raw = argv[++i];
      target = isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
    }
  }
  return { target };
}

function shouldExcludePath(sourcePath) {
  const parts = sourcePath.split(/[/\\]/);
  if (parts.some((p) => EXCLUDE_DIRS.has(p))) return true;
  const rel = relative(repoRoot, sourcePath).replace(/\\/g, "/");
  if (!rel || rel.startsWith("..")) return false;
  return EXPORT_SKIP_PREFIXES.some(
    (prefix) => rel === prefix || rel.startsWith(`${prefix}/`)
  );
}

function copyFiltered(src, dest, filterFn) {
  cpSync(src, dest, {
    recursive: true,
    filter: (sourcePath) => {
      if (shouldExcludePath(sourcePath)) return false;
      return filterFn ? filterFn(sourcePath) : true;
    }
  });
}

function copyBackendModules(target) {
  const srcRoot = join(repoRoot, "backend/src/modules");
  const destRoot = join(target, "backend/src/modules");
  mkdirSync(destRoot, { recursive: true });
  writeFileSync(join(destRoot, ".gitkeep"), "");
  for (const name of readdirSync(srcRoot)) {
    if (!BACKEND_MODULES_KEEP.has(name)) continue;
    copyFiltered(join(srcRoot, name), join(destRoot, name));
    console.log(`  ✓ backend module ${name}`);
  }
}

function copyScripts(target) {
  const srcRoot = join(repoRoot, "scripts");
  const destRoot = join(target, "scripts");
  mkdirSync(destRoot, { recursive: true });
  for (const name of readdirSync(srcRoot)) {
    if (name === "lib") {
      copyFiltered(join(srcRoot, "lib"), join(destRoot, "lib"));
      console.log("  ✓ scripts/lib/");
      continue;
    }
    if (name === "git-hooks") {
      copyFiltered(join(srcRoot, "git-hooks"), join(destRoot, "git-hooks"));
      console.log("  ✓ scripts/git-hooks/");
      continue;
    }
    if (!SCRIPTS_KEEP.has(name)) continue;
    cpSync(join(srcRoot, name), join(destRoot, name));
    console.log(`  ✓ scripts/${name}`);
  }
}

function copyDocs(target) {
  const destDocs = join(target, "docs");
  mkdirSync(destDocs, { recursive: true });
  copyFiltered(join(repoRoot, "docs/architecture"), join(destDocs, "architecture"));
  console.log("  ✓ docs/architecture/");
  for (const name of DOCS_KEEP_FILES) {
    const src = join(repoRoot, "docs", name);
    if (existsSync(src)) {
      cpSync(src, join(destDocs, name));
      console.log(`  ✓ docs/${name}`);
    }
  }
  const apiStarter = resolveTemplate("docs/API.starter.md", "docs/API.md");
  if (apiStarter) {
    cpSync(apiStarter, join(destDocs, "API.md"));
  } else {
    writeFileSync(
      join(destDocs, "API.md"),
      "# API registry (starter)\n\nRegister routes in this file. Run `npm run lint:api-docs` after adding modules.\n"
    );
  }
  mkdirSync(join(destDocs, "model-condenser"), { recursive: true });
  cpSync(
    join(repoRoot, "docs/model-condenser/API.md"),
    join(destDocs, "model-condenser/API.md")
  );
  console.log("  ✓ docs/API.md (starter registry)");
}

function copyWorkLog(target) {
  const dest = join(target, "work-log");
  mkdirSync(dest, { recursive: true });
  for (const name of ["README.md"]) {
    cpSync(join(repoRoot, "work-log", name), join(dest, name));
  }
  writeFileSync(
    join(dest, "INDEX.md"),
    `# Work log — index\n\nSee [README.md](./README.md). Add handoffs, study-docs, and dev-log rows as you work.\n`
  );
  copyFiltered(join(repoRoot, "work-log/dev-logs"), join(dest, "dev-logs"), (p) => {
    const base = p.split(/[/\\]/).pop() || "";
    if (/^\d{3}_\d{4}-\d{2}-\d{2}_.*dev-log/.test(base)) return false;
    if (p.includes("/human/") && p.endsWith(".md")) return !/\/human\/\d{3}_/.test(p);
    if (p.includes("/agent/") && p.endsWith(".json")) return !/\/agent\/\d{3}_/.test(p);
    return true;
  });
  mkdirSync(join(dest, "handoffs"), { recursive: true });
  cpSync(join(repoRoot, "work-log/handoffs/README.md"), join(dest, "handoffs/README.md"));
  mkdirSync(join(dest, "study-docs"), { recursive: true });
  cpSync(join(repoRoot, "work-log/study-docs/README.md"), join(dest, "study-docs/README.md"));
  mkdirSync(join(dest, "planning"), { recursive: true });
  writeFileSync(join(dest, "planning/.gitkeep"), "");
  console.log("  ✓ work-log/ (structure, planning/, no domain handoffs)");
}

function copyFileExchange(target) {
  const dest = join(target, "file-exchange");
  mkdirSync(join(dest, "imports"), { recursive: true });
  mkdirSync(join(dest, "exports"), { recursive: true });
  writeFileSync(join(dest, "imports/.gitkeep"), "");
  writeFileSync(join(dest, "exports/.gitkeep"), "");
  cpSync(join(repoRoot, "file-exchange/README.md"), join(dest, "README.md"));
  console.log("  ✓ file-exchange/");
}

function copyCursor(target) {
  copyFiltered(join(repoRoot, ".agents"), join(target, ".agents"));
  console.log("  ✓ .agents/");
}

function copyGithubCi(target) {
  const src = join(repoRoot, ".github/workflows/ci.yml");
  if (!existsSync(src)) return;
  const dest = join(target, ".github/workflows/ci.yml");
  mkdirSync(join(target, ".github/workflows"), { recursive: true });
  cpSync(src, dest);
  console.log("  ✓ .github/workflows/ci.yml");
}

function copyPlatformArchitectureDoc(target) {
  const src = join(repoRoot, "docs/architecture/PLATFORM_ARCHITECTURE.md");
  const dest = join(target, "docs/architecture/PLATFORM_ARCHITECTURE.md");
  if (existsSync(src)) {
    cpSync(src, dest);
    console.log("  ✓ docs/architecture/PLATFORM_ARCHITECTURE.md");
  }
}

function copySharedContracts(target) {
  const sharedContracts = join(target, "backend/src/shared/contracts");
  mkdirSync(sharedContracts, { recursive: true });
  console.log("  ✓ backend/src/shared/ (via backend copy)");
}

function writeStarterRootFiles(target) {
  const pkg = resolveTemplate("package.starter.json");
  if (pkg) cpSync(pkg, join(target, "package.json"));
  else {
    const rootPkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    writeFileSync(
      join(target, "package.json"),
      JSON.stringify(
        {
          name: "modular-monolith-starter",
          private: true,
          version: "0.1.0",
          scripts: rootPkg.scripts
        },
        null,
        2
      )
    );
  }
  const agents = resolveTemplate("AGENTS.starter.md", "AGENTS.md");
  if (agents) cpSync(agents, join(target, "AGENTS.md"));
  const readme = resolveTemplate("README.starter.md", "README.md");
  if (readme) cpSync(readme, join(target, "README.md"));
  cpSync(join(repoRoot, ".gitignore"), join(target, ".gitignore"));
  const license = resolveTemplate("LICENSE.starter", "LICENSE");
  if (license) cpSync(license, join(target, "LICENSE"));
  const notice = resolveTemplate("NOTICE.starter", "NOTICE");
  if (notice) cpSync(notice, join(target, "NOTICE"));
  mkdirSync(join(target, "consolidated-files"), { recursive: true });
  writeFileSync(join(target, "consolidated-files/.gitkeep"), "");
  console.log("  ✓ package.json, AGENTS.md, README, LICENSE, NOTICE, consolidated-files/.gitkeep");
}

function patchStarterScripts(target) {
  const condensePrompts = resolveTemplate("condense-prompts.starter.mjs", "scripts/condense-prompts.mjs");
  if (condensePrompts) cpSync(condensePrompts, join(target, "scripts/condense-prompts.mjs"));
  const modelService = resolveTemplate(
    "modelCondenser.service.starter.js",
    "backend/src/modules/model-condenser/services/modelCondenser.service.js"
  );
  if (modelService) {
    cpSync(
      modelService,
      join(target, "backend/src/modules/model-condenser/services/modelCondenser.service.js")
    );
  }
  const apiInventory = resolveTemplate("api-inventory.starter.mjs", "scripts/lib/api-inventory.mjs");
  if (apiInventory) cpSync(apiInventory, join(target, "scripts/lib/api-inventory.mjs"));
  const modelTest = resolveTemplate(
    "modelCondenser.service.test.starter.js",
    "backend/src/modules/model-condenser/tests/unit/modelCondenser.service.test.js"
  );
  if (modelTest) {
    cpSync(
      modelTest,
      join(target, "backend/src/modules/model-condenser/tests/unit/modelCondenser.service.test.js")
    );
  }
  const repoTreePath = join(target, "scripts/lib/repo-tree.mjs");
  let repoTree = readFileSync(repoTreePath, "utf8");
  repoTree = repoTree.replace(
    /export const TREE_IGNORE_PREFIXES = \[[\s\S]*?\];/,
    'export const TREE_IGNORE_PREFIXES = ["data"];'
  );
  writeFileSync(repoTreePath, repoTree);

  const fileStructurePath = join(target, "scripts/condense-file-structure.mjs");
  let fileStructure = readFileSync(fileStructurePath, "utf8");
  fileStructure = fileStructure.replace(
    "and runtime batch/export paths.",
    "and runtime data/ (if present)."
  );
  writeFileSync(fileStructurePath, fileStructure);

  const fxReadme = join(target, "file-exchange/README.md");
  if (existsSync(fxReadme)) {
    let fx = readFileSync(fxReadme, "utf8");
    fx = fx.replace("case-filing APIs", "your module APIs");
    writeFileSync(fxReadme, fx);
  }

  const condenserRoutesTest = join(
    target,
    "backend/src/modules/model-condenser/tests/integration/modelCondenser.routes.test.js"
  );
  if (existsSync(condenserRoutesTest)) {
    let routesTest = readFileSync(condenserRoutesTest, "utf8");
    routesTest = routesTest.replace("body.modelCount >= 16", "body.modelCount >= 1");
    writeFileSync(condenserRoutesTest, routesTest);
  }

  console.log("  ✓ starter patches (prompts, model-condenser, repo-tree, api-inventory)");
}

function writeManifest(target) {
  const manifest = {
    exportedAt: new Date().toISOString(),
    sourceRepo: "legal-prmpt-eng",
    description: "Architecture-only starter — no domain modules, no build artifacts",
    included: {
      backendModules: [...BACKEND_MODULES_KEEP],
      frontendModules: [...FRONTEND_MODULES_KEEP],
      docs: ["docs/architecture/**", "docs/API.md (starter)", "docs/model-condenser/API.md"],
      scripts: [...SCRIPTS_KEEP, "scripts/lib/**", "scripts/git-hooks/**"],
      other: [
        "file-exchange/",
        "work-log/ (structure)",
        ".agents/",
        "backend/src/core",
        "backend/src/shared",
        "frontend/src/core",
        "frontend/src/shared"
      ]
    },
    excluded: {
      dirs: [...EXCLUDE_DIRS],
      backendModules: "case-filing-ai, court-rules, case-workflow, filing-*, human-review, task-docketing",
      data: "runtime batches, golden fixtures, PDFs",
      scripts: "ingest-golden-*, rerun-batch-evals, run-module-evals"
    },
    nextSteps: [
      "Review file-exchange/exports/architecture-starter/ARCHITECTURE_EXPORT_README.md",
      "npm install in backend/ and frontend/",
      "npm run lint:contracts && npm run lint:architecture",
      "node scripts/new-module.mjs my-feature --label \"My Feature\"",
      "Copy into packages/create-modular-monolith/template or publish CLI"
    ]
  };
  writeFileSync(join(target, "EXPORT_MANIFEST.json"), JSON.stringify(manifest, null, 2));
}

function writeExportReadme(target) {
  const md = `# Architecture starter export

Generated by \`npm run export:architecture-starter\`.

## What this is

A **clean modular-monolith boilerplate**: contracts, file-exchange, planning gate (study log + plan before build), pre-push dev-logs, model-condenser, \`_reference\` module, lint scripts — **without** litigation/case-filing domain modules or runtime data.

## What was excluded

- Domain backend/frontend modules (case-filing-ai, court-rules, …)
- \`node_modules\`, \`dist\`, \`build\`
- \`data/\`, \`evals/golden\`, batch PDFs, import bundles
- Legal-specific ingest/eval scripts

See \`EXPORT_MANIFEST.json\` for the full list.

## Update npm CLI template

\`\`\`bash
npm run export:architecture-starter -- --to ../create-modular-monolith/packages/template
# or from this repo:
npm run export:architecture-starter -- --to packages/create-modular-monolith/template
cd packages/create-modular-monolith && npm publish --access public
\`\`\`

## Docs

Start at [docs/architecture/CONTRACTS_OVERVIEW.md](docs/architecture/CONTRACTS_OVERVIEW.md).

`;
  writeFileSync(join(target, "ARCHITECTURE_EXPORT_README.md"), md);
}

function patchContractsManifest(target) {
  const starterManifest =
    resolveTemplate("manifest.starter.json") ??
    join(repoRoot, "docs/architecture/contracts/manifest.json");
  const dest = join(target, "docs/architecture/contracts/manifest.json");
  cpSync(starterManifest, dest);
  console.log("  ✓ docs/architecture/contracts/manifest.json (platform/starter)");
}

function patchLintRepoArtifacts(target) {
  const path = join(target, "scripts/lint-repo-artifacts.mjs");
  let text = readFileSync(path, "utf8");
  text = text.replace(
    /const requiredPaths = \[[\s\S]*?\];/,
    `const requiredPaths = [
  "docs/architecture/CONTRACTS_OVERVIEW.md",
  "docs/architecture/REPO_ARTIFACT_LAYOUT.md",
  "docs/architecture/contracts/manifest.json",
  "docs/architecture/contracts/changelog.jsonl",
  "docs/architecture/contracts/fileExchange.contract.md",
  "docs/architecture/contracts/consolidatedExports.contract.md",
  "docs/architecture/contracts/prePushDevLog.contract.md",
  "docs/architecture/contracts/planningPhase.contract.md",
  "docs/architecture/contracts/moduleAgentStateMachine.contract.md",
  "docs/architecture/contracts/pipelineAgentMiniModules.contract.md",
  "docs/architecture/contracts/asyncJobQueue.contract.md",
  "docs/architecture/contracts/apiDocumentationRegistry.contract.md",
  "backend/src/shared/contracts/pipelineAgentMiniModules.contract.js",
  "backend/src/shared/contracts/pipeline-agent-mini-modules.registry.json",
  "backend/src/shared/contracts/moduleAgentStateMachine.contract.js",
  "backend/src/shared/contracts/prePushDevLog.contract.js",
  "backend/src/shared/contracts/planningPhase.contract.js",
  "backend/src/shared/contracts/consolidatedExports.contract.js",
  "work-log/dev-logs/schemas/dev-log-agent.v1.schema.json",
  "work-log/dev-logs/human",
  "work-log/dev-logs/agent",
  "file-exchange/README.md",
  "file-exchange/imports",
  "file-exchange/exports",
  "docs/API.md",
  "backend/src/modules/_reference/index.js",
  "backend/src/modules/model-condenser/index.js"
];`
  );
  writeFileSync(path, text);
}

function main() {
  const { target } = parseArgs(process.argv.slice(2));
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
  mkdirSync(target, { recursive: true });

  console.log(`Exporting architecture starter → ${target}\n`);

  console.log("Backend core + shared:");
  copyFiltered(join(repoRoot, "backend/src/core"), join(target, "backend/src/core"));
  copyFiltered(join(repoRoot, "backend/src/shared"), join(target, "backend/src/shared"));
  copyBackendModules(target);

  console.log("\nFrontend:");
  for (const f of ["package.json", ".env.example"]) {
    const src = join(repoRoot, "backend", f);
    if (existsSync(src)) cpSync(src, join(target, "backend", f));
  }
  copyFiltered(join(repoRoot, "backend/scripts"), join(target, "backend/scripts"));
  mkdirSync(join(target, "backend/db/migrations"), { recursive: true });
  writeFileSync(join(target, "backend/db/migrations/.gitkeep"), "");
  console.log("  ✓ backend/package.json, scripts/, db/");

  console.log("\nFrontend shell:");
  for (const f of ["package.json", "index.html", "vite.config.js", ".env.example"]) {
    const src = join(repoRoot, "frontend", f);
    if (existsSync(src)) cpSync(src, join(target, "frontend", f));
  }
  copyFiltered(join(repoRoot, "frontend/src"), join(target, "frontend/src"), (p) => {
    const parts = p.split(/[/\\]/);
    const modIdx = parts.indexOf("modules");
    if (modIdx >= 0 && parts[modIdx + 1]) {
      return FRONTEND_MODULES_KEEP.has(parts[modIdx + 1]);
    }
    return true;
  });
  console.log("  ✓ frontend/");

  console.log("\nDocs, scripts, exchange, work-log:");
  copyDocs(target);
  copyScripts(target);
  copyFileExchange(target);
  copyWorkLog(target);
  copyCursor(target);
  copyGithubCi(target);
  copyPlatformArchitectureDoc(target);

  console.log("\nRoot:");
  writeStarterRootFiles(target);
  patchStarterScripts(target);
  patchContractsManifest(target);
  patchLintRepoArtifacts(target);
  writeManifest(target);
  writeExportReadme(target);

  console.log(`\nDone. See ${target}/ARCHITECTURE_EXPORT_README.md`);
}

main();
