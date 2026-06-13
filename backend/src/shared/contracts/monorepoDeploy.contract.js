/** @readonly Monorepo deploy layout — Railway backend + Vercel frontend. */

export const MONOREPO_DEPLOY_VERSION = "v003";

/** @type {Record<string, { root: string, platform: string, requiredFiles: string[], envVars: string[] }>} */
export const DEPLOY_TARGETS = {
  backend: {
    root: "backend",
    platform: "railway",
    requiredFiles: ["backend/package.json", "backend/railway.toml", "backend/.env.example"],
    forbiddenFiles: ["backend/vercel.json"],
    startScript: "start",
    envVars: [
      "PORT",
      "NODE_ENV",
      "HADES_USER_ID",
      "HERMES_MODE",
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_ANON_KEY",
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
export const ROOT_FORBIDDEN_SCRIPTS = ["start"];

export const DEPLOY_DOC = "docs/DEPLOY.md";

export const FRONTEND_API_CLIENT = "frontend/src/shared/api/client.js";

export const FRONTEND_API_BASE_ENV = "VITE_API_BASE_URL";
