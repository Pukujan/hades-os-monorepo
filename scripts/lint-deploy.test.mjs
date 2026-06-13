import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { DEPLOY_TARGETS } from "../backend/src/shared/contracts/monorepoDeploy.contract.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("deploy contract explicitly assigns Railway to backend and Vercel to frontend", () => {
  assert.equal(DEPLOY_TARGETS.backend.root, "backend");
  assert.equal(DEPLOY_TARGETS.backend.platform, "railway");
  assert.equal(DEPLOY_TARGETS.frontend.root, "frontend");
  assert.equal(DEPLOY_TARGETS.frontend.platform, "vercel");
});

test("deploy config files exist only in their owning app folders", () => {
  assert.equal(existsSync(join(repoRoot, "backend/railway.toml")), true);
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

