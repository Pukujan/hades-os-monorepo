#!/usr/bin/env node
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  DEPLOY_TARGETS,
  ROOT_FORBIDDEN_SCRIPTS,
  DEPLOY_DOC,
  FRONTEND_API_CLIENT,
  FRONTEND_API_BASE_ENV
} from "../backend/src/shared/contracts/monorepoDeploy.contract.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

for (const target of Object.values(DEPLOY_TARGETS)) {
  for (const rel of target.requiredFiles) {
    if (!existsSync(join(repoRoot, rel))) {
      failures.push(`Missing deploy artifact: ${rel}`);
    }
  }

  for (const rel of target.forbiddenFiles || []) {
    if (existsSync(join(repoRoot, rel))) {
      failures.push(`Forbidden deploy artifact for ${target.platform} target: ${rel}`);
    }
  }
}

const rootPkgPath = join(repoRoot, "package.json");
if (existsSync(rootPkgPath)) {
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf8"));
  for (const script of ROOT_FORBIDDEN_SCRIPTS) {
    if (rootPkg.scripts?.[script]) {
      failures.push(`Root package.json must not define scripts.${script}`);
    }
  }
}

const backendPkgPath = join(repoRoot, "backend/package.json");
if (existsSync(backendPkgPath)) {
  const backendPkg = JSON.parse(readFileSync(backendPkgPath, "utf8"));
  if (!backendPkg.scripts?.start) {
    failures.push("backend/package.json must define scripts.start");
  }
}

const frontendPkgPath = join(repoRoot, "frontend/package.json");
if (existsSync(frontendPkgPath)) {
  const frontendPkg = JSON.parse(readFileSync(frontendPkgPath, "utf8"));
  if (!frontendPkg.scripts?.build) {
    failures.push("frontend/package.json must define scripts.build");
  }
}

if (!existsSync(join(repoRoot, DEPLOY_DOC))) {
  failures.push(`Missing deploy guide: ${DEPLOY_DOC}`);
} else {
  const deployDoc = readFileSync(join(repoRoot, DEPLOY_DOC), "utf8");
  if (!deployDoc.includes("Railway hosts `backend/` only")) {
    failures.push(`${DEPLOY_DOC} must explicitly state Railway hosts backend only`);
  }
  if (!deployDoc.includes("Vercel hosts `frontend/` only")) {
    failures.push(`${DEPLOY_DOC} must explicitly state Vercel hosts frontend only`);
  }
}

const apiClientPath = join(repoRoot, FRONTEND_API_CLIENT);
if (existsSync(apiClientPath)) {
  const apiClient = readFileSync(apiClientPath, "utf8");
  if (!apiClient.includes(FRONTEND_API_BASE_ENV)) {
    failures.push(`${FRONTEND_API_CLIENT} must reference ${FRONTEND_API_BASE_ENV}`);
  }
} else {
  failures.push(`Missing API client: ${FRONTEND_API_CLIENT}`);
}

for (const target of Object.values(DEPLOY_TARGETS)) {
  for (const envVar of target.envVars || []) {
    const envPath = join(repoRoot, target.root, ".env.example");
    if (!existsSync(envPath)) {
      continue;
    }
    const envText = readFileSync(envPath, "utf8");
    if (!envText.includes(`${envVar}=`)) {
      failures.push(`${target.root}/.env.example must document ${envVar}`);
    }
  }
}

if (failures.length) {
  console.error("Deploy lint failed:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log("Deploy lint OK");
