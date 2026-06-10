/** @readonly Monorepo deploy layout — Railway backend + Vercel frontend. */

export const MONOREPO_DEPLOY_VERSION = "v001";

/** @type {Record<string, { root: string, platform: string, requiredFiles: string[], envVars: string[] }>} */
export const DEPLOY_TARGETS = {
  backend: {
    root: "backend",
    platform: "railway",
    requiredFiles: ["backend/package.json", "backend/railway.toml"],
    startScript: "start",
    envVars: ["DATABASE_URL", "QUEUE_DISABLED"]
  },
  frontend: {
    root: "frontend",
    platform: "vercel",
    requiredFiles: ["frontend/package.json", "frontend/vercel.json"],
    buildScript: "build",
    buildOutputDir: "dist",
    envVars: ["VITE_API_BASE_URL"]
  }
};

/** Scripts forbidden on repo root package.json. */
export const ROOT_FORBIDDEN_SCRIPTS = ["start"];

export const DEPLOY_DOC = "docs/DEPLOY.md";

export const FRONTEND_API_CLIENT = "frontend/src/shared/api/client.js";

export const FRONTEND_API_BASE_ENV = "VITE_API_BASE_URL";
