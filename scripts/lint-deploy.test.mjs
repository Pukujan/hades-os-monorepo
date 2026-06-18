import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { DEPLOY_TARGETS } from "../backend/src/shared/contracts/monorepoDeploy.contract.js";
import { execSync } from "child_process";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const isCI = process.env.CI === "true";

// ===================================================================
// Group 1 — Deploy contract structure (should already pass)
// ===================================================================

test("deploy contract explicitly assigns Railway to backend and Vercel to frontend", () => {
  assert.equal(DEPLOY_TARGETS.backend.root, "backend");
  assert.equal(DEPLOY_TARGETS.backend.platform, "railway");
  assert.equal(DEPLOY_TARGETS.frontend.root, "frontend");
  assert.equal(DEPLOY_TARGETS.frontend.platform, "vercel");
});

test("deploy config files exist only in their owning app folders", () => {
  assert.equal(existsSync(join(repoRoot, "railway.toml")), true);
  assert.equal(existsSync(join(repoRoot, "backend/Dockerfile")), true);
  assert.equal(existsSync(join(repoRoot, "backend/.dockerignore")), true);
  assert.equal(existsSync(join(repoRoot, "frontend/vercel.json")), true);
  assert.equal(existsSync(join(repoRoot, "backend/vercel.json")), false);
  assert.equal(existsSync(join(repoRoot, "frontend/railway.toml")), false);
});

test("env templates document every hosting variable required by the contract", () => {
  for (const target of Object.values(DEPLOY_TARGETS)) {
    const envText = readFileSync(join(repoRoot, target.root, ".env.example"), "utf8");
    for (const envVar of target.envVars) {
      assert.equal(envText.includes(`${envVar}=`), true, `${target.root}/.env.example missing ${envVar}`);
    }
  }
});

test("deploy docs state the platform split explicitly", () => {
  const deployDoc = readFileSync(join(repoRoot, "docs/DEPLOY.md"), "utf8");
  assert.match(deployDoc, /Railway hosts `backend\/` only/);
  assert.match(deployDoc, /Vercel hosts `frontend\/` only/);
});

// ===================================================================
// Group 2 — Railway: root build must install backend deps
//   (RED: fails against current `echo 'Build handled by Dockerfile'`)
// ===================================================================

test("root build script must not be a no-op echo", () => {
  const rootPkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const build = rootPkg.scripts?.build;
  assert.ok(build, "root package.json must define scripts.build");
  assert.notEqual(build, "echo 'Build handled by Dockerfile'", "root build must not be a no-op echo");
  assert.ok(build.length > 5, "root build must be a real command");
});

test("root build script must install backend dependencies", () => {
  const rootPkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const build = rootPkg.scripts?.build;
  assert.ok(build, "root package.json must define scripts.build");
  assert.ok(build.includes("backend"), "root build must reference backend/ to install deps");
  assert.ok(build.includes("ci") || build.includes("install"), "root build must run ci / install");
});

test("root start script forwards to backend entry point", () => {
  const rootPkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const start = rootPkg.scripts?.start;
  assert.ok(start, "root package.json must define scripts.start");
  assert.ok(start.includes("backend"), "root start must forward to backend entry point");
});

// ===================================================================
// Group 3 — dotenv production dependency check
//   (already green — dotenv is in backend/package.json dependencies)
// ===================================================================

test("dotenv is a production dependency of backend", () => {
  const backendPkg = JSON.parse(readFileSync(join(repoRoot, "backend/package.json"), "utf8"));
  assert.ok(backendPkg.dependencies, "backend must have dependencies");
  assert.ok("dotenv" in backendPkg.dependencies, "dotenv must be in backend dependencies (not devDependencies)");
  assert.ok(backendPkg.dependencies.dotenv.length > 0, "dotenv version must be specified");
});

test("server.js imports dotenv", () => {
  const serverJs = readFileSync(join(repoRoot, "backend/src/core/server.js"), "utf8");
  assert.match(serverJs, /import dotenv from ["']dotenv["']/);
});

// ===================================================================
// Group 4 — Clean simulation tests
//   (RED: fails because root build is echo, backend deps not installed)
//   SKIP locally unless CI=true — destructive npm ci modifies node_modules
// ===================================================================

test("root npm ci && npm run build installs dotenv in backend/node_modules", { skip: !isCI, timeout: 180_000 }, () => {
  execSync("npm ci", { cwd: repoRoot, stdio: "pipe" });
  execSync("npm run build", { cwd: repoRoot, stdio: "pipe" });
  const dotenvPath = join(repoRoot, "backend", "node_modules", "dotenv", "package.json");
  assert.equal(existsSync(dotenvPath), true, "dotenv must be in backend/node_modules after root build");
  const corsPath = join(repoRoot, "backend", "node_modules", "cors", "package.json");
  assert.equal(existsSync(corsPath), true, "cors must be in backend/node_modules after root build");
});

test("frontend npm ci && npm run build produces dist/", { skip: !isCI, timeout: 180_000 }, () => {
  execSync("npm ci", { cwd: join(repoRoot, "frontend"), stdio: "pipe" });
  execSync("npm run build", { cwd: join(repoRoot, "frontend"), stdio: "pipe" });
  assert.equal(existsSync(join(repoRoot, "frontend", "dist", "index.html")), true, "frontend build must produce dist/index.html");
});

// ===================================================================
// Group 5 — Vercel frontend root checks
//   (all already green — config is correct for Vercel)
// ===================================================================

test("root vercel.json sets rootDirectory to frontend", () => {
  assert.equal(existsSync(join(repoRoot, "vercel.json")), true, "root vercel.json must exist");
  const rootVercel = JSON.parse(readFileSync(join(repoRoot, "vercel.json"), "utf8"));
  assert.equal(rootVercel.rootDirectory, "frontend", "root vercel.json must set rootDirectory to frontend");
});

test("frontend vercel.json has SPA rewrite to /index.html", () => {
  const vercelJson = readFileSync(join(repoRoot, "frontend/vercel.json"), "utf8");
  assert.match(vercelJson, /\/index\.html/);
  assert.match(vercelJson, /\/index\.html/);
});

test("frontend build script uses vite build", () => {
  const frontendPkg = JSON.parse(readFileSync(join(repoRoot, "frontend/package.json"), "utf8"));
  const build = frontendPkg.scripts?.build;
  assert.ok(build, "frontend package.json must define scripts.build");
  assert.ok(build.includes("vite build"), "frontend build must use vite build");
});

test("frontend deploy contract declares dist as build output directory", () => {
  assert.equal(DEPLOY_TARGETS.frontend.buildOutputDir, "dist");
});

test("DEPLOY.md documents Vercel Root Directory = frontend", () => {
  const deployDoc = readFileSync(join(repoRoot, "docs/DEPLOY.md"), "utf8");
  assert.match(deployDoc, /Root Directory.*frontend/);
});

test("DEPLOY.md documents Railway Root Directory = backend", () => {
  const deployDoc = readFileSync(join(repoRoot, "docs/DEPLOY.md"), "utf8");
  assert.match(deployDoc, /Root Directory.*backend/);
});

// ===================================================================
// Group 6 — Build artifact smoke test
//   Requires: frontend/dist/ exists (skipped locally if not built)
//   Verifies: VITE_API_BASE_URL baked into assets, zero optional
//   chaining on import.meta.env leaks into the bundle.
// ===================================================================

const distAssetsDir = join(repoRoot, "frontend", "dist", "assets");
const distExists = existsSync(distAssetsDir);

function getDistJsFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter(e => e.isFile() && e.name.endsWith(".js"))
    .map(e => join(e.parentPath ?? e.path ?? dir, e.name));
}

test("production build bakes VITE_API_BASE_URL into assets", { skip: !distExists }, () => {
  const jsFiles = getDistJsFiles(distAssetsDir);
  assert.ok(jsFiles.length > 0, "dist/assets must contain JS files");

  const allJs = jsFiles.map(f => readFileSync(f, "utf8")).join("\n");
  const railwayUrl = "https://hades-os-monorepo-production.up.railway.app";
  assert.ok(allJs.includes(railwayUrl), `built JS must contain Railway URL "${railwayUrl}"`);
});

test("built bundle must not contain optional chaining on import.meta.env", { skip: !distExists }, () => {
  const jsFiles = getDistJsFiles(distAssetsDir);
  assert.ok(jsFiles.length > 0, "dist/assets must contain JS files");

  for (const f of jsFiles) {
    const src = readFileSync(f, "utf8");
    assert.doesNotMatch(src, /import\.meta\?\.env/, `${f} must not contain import.meta?.env`);
    assert.doesNotMatch(src, /import\.meta\.env\?\./, `${f} must not contain import.meta.env?.`);
  }
});

// ===================================================================
// Group 7 — Secret / Hermes leakage prevention
//   (already green — backend/.gitignore blocks all patterns)
// ===================================================================

test("backend .gitignore blocks local secrets and artifacts", () => {
  const gitignore = readFileSync(join(repoRoot, "backend/.gitignore"), "utf8");
  const blocked = [".env", "auth.json", ".hermes_history", "audio_cache/", ".skills_prompt_snapshot.json"];
  for (const pattern of blocked) {
    assert.ok(gitignore.includes(pattern), `backend/.gitignore must block ${pattern}`);
  }
});

// ===================================================================
// Group 8 — Pre-push dev log enforcement
// ===================================================================

const agentDir = join(repoRoot, "work-log/dev-logs/agent");
const humanDir = join(repoRoot, "work-log/dev-logs/human");

function getLatestAgentLog() {
  const files = readdirSync(agentDir).filter(f => f.endsWith(".json") && f !== ".gitkeep").sort();
  const latest = files[files.length - 1];
  if (!latest) return null;
  const path = join(agentDir, latest);
  const doc = JSON.parse(readFileSync(path, "utf8"));
  return { path, filename: latest, doc };
}

function getHumanPathForAgent(agentFilename) {
  return join(humanDir, agentFilename.replace("_dev-log-agent_", "_dev-log_").replace(/\.json$/, ".md"));
}

test("dev-log agent JSON exists for current HEAD commit", () => {
  const headSha = execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  const log = getLatestAgentLog();
  assert.ok(log, "at least one agent dev-log must exist in work-log/dev-logs/agent/");
  assert.equal(log.doc.git?.sha, headSha, `latest agent dev-log must match HEAD sha (${headSha})`);
});

test("dev-log pair: human MD exists alongside agent JSON", () => {
  const log = getLatestAgentLog();
  assert.ok(log, "agent dev-log must exist");
  const humanPath = getHumanPathForAgent(log.filename);
  assert.ok(existsSync(humanPath), `human dev-log must exist at ${humanPath}`);
  const humanContent = readFileSync(humanPath, "utf8");
  assert.ok(humanContent.length > 100, "human dev-log must have substantial content");
});

test("dev-log agent JSON has all required top-level keys", () => {
  const log = getLatestAgentLog();
  assert.ok(log, "agent dev-log must exist");
  const required = ["meta", "summary", "apis", "git", "tests", "repositoryTree", "changes", "decisions", "iterations", "risks", "followUps"];
  for (const key of required) {
    assert.ok(key in log.doc, `agent dev-log must have key "${key}"`);
  }
});

test("dev-log agent JSON summary is filled (not default placeholder)", () => {
  const log = getLatestAgentLog();
  assert.ok(log, "agent dev-log must exist");
  assert.ok(log.doc.summary, "summary must be non-empty");
  assert.ok(!log.doc.summary.includes("FILL"), "summary must not contain placeholder text 'FILL'");
  assert.ok(log.doc.summary.length > 20, "summary must be substantive (>20 chars)");
});

test("dev-log agent JSON has at least one documented decision that is filled", () => {
  const log = getLatestAgentLog();
  assert.ok(log, "agent dev-log must exist");
  assert.ok(Array.isArray(log.doc.decisions), "decisions must be an array");
  assert.ok(log.doc.decisions.length >= 1, "at least one decision must exist");
  for (const d of log.doc.decisions) {
    assert.ok(d.decision && !d.decision.includes("FILL"), `decision "${d.id}" must be filled`);
    assert.ok(d.rationale && !d.rationale.includes("FILL"), `decision "${d.id}" must have filled rationale`);
  }
});

test("dev-log agent JSON git section has changedFiles", () => {
  const log = getLatestAgentLog();
  assert.ok(log, "agent dev-log must exist");
  assert.ok(Array.isArray(log.doc.git?.changedFiles), "git.changedFiles must be an array");
  assert.ok(log.doc.git.changedFiles.length > 0, "git.changedFiles must list changed files");
});

test("dev-log agent JSON tests section confirms tests ran", () => {
  const log = getLatestAgentLog();
  assert.ok(log, "agent dev-log must exist");
  assert.ok(log.doc.tests?.ran === true, "tests.ran must be true");
});

test("dev-log agent JSON repositoryTree has treeText", () => {
  const log = getLatestAgentLog();
  assert.ok(log, "agent dev-log must exist");
  assert.ok(log.doc.repositoryTree?.treeText?.length > 100, "repositoryTree.treeText must be present and substantial");
});

test("dev-log human MD has required section headers", () => {
  const log = getLatestAgentLog();
  assert.ok(log, "agent dev-log must exist");
  const humanPath = getHumanPathForAgent(log.filename);
  const content = readFileSync(humanPath, "utf8");
  const sections = ["## Table of contents", "Part I", "Part II"];
  for (const s of sections) {
    assert.ok(content.includes(s), `human dev-log must include "${s}"`);
  }
});
