/** @readonly Monorepo deploy layout — Railway backend + Vercel frontend. */

export const MONOREPO_DEPLOY_VERSION = "v004";

/** @type {Record<string, { root: string, platform: string, requiredFiles: string[], envVars: string[] }>} */
export const DEPLOY_TARGETS = {
  backend: {
    root: "backend",
    platform: "railway",
    requiredFiles: ["backend/package.json", "railway.toml", "backend/.env.example", "backend/Dockerfile", "backend/.dockerignore"],
    forbiddenFiles: ["backend/vercel.json"],
    startScript: "start",
    envVars: [
      "PORT",
      "NODE_ENV",
      "HERMES_REQUIRED",
      "HERMES_BIN_PATH",
      "HERMES_HOME",
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_ANON_KEY",
      "ENCRYPTION_KEY",
      "OPENROUTER_BASE_URL",
      "OPENROUTER_API_KEY",
      "OPENROUTER_MODEL",
      "OPENROUTER_HTTP_REFERER",
      "OPENROUTER_APP_TITLE",
      "CORS_ORIGIN"
    ]
  },
  frontend: {
    root: "frontend",
    platform: "vercel",
    requiredFiles: ["frontend/package.json", "frontend/vercel.json", "frontend/.env.example"],
    forbiddenFiles: ["frontend/railway.toml"],
    buildScript: "build",
    buildOutputDir: "dist",
    envVars: ["VITE_API_BASE_URL"]
  }
};

/** Scripts forbidden on repo root package.json. */
export const ROOT_FORBIDDEN_SCRIPTS = [];

export const DEPLOY_DOC = "docs/DEPLOY.md";

export const FRONTEND_API_CLIENT = "frontend/src/shared/api/client.js";

export const FRONTEND_API_BASE_ENV = "VITE_API_BASE_URL";
