import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "fs";
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
  assert.equal(existsSync(join(repoRoot, "backend/railway.toml")), true);
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

test("no root vercel.json exists — Vercel must deploy from frontend/", () => {
  assert.equal(existsSync(join(repoRoot, "vercel.json")), false, "root vercel.json must not exist");
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
// Group 6 — Secret / Hermes leakage prevention
//   (already green — backend/.gitignore blocks all patterns)
// ===================================================================

test("backend .gitignore blocks local secrets and artifacts", () => {
  const gitignore = readFileSync(join(repoRoot, "backend/.gitignore"), "utf8");
  const blocked = [".env", "auth.json", ".hermes_history", "audio_cache/", ".skills_prompt_snapshot.json"];
  for (const pattern of blocked) {
    assert.ok(gitignore.includes(pattern), `backend/.gitignore must block ${pattern}`);
  }
});
