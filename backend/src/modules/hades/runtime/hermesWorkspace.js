import path from "node:path";

const DANGEROUS_ENV_KEYS = new Set([
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "TELEGRAM_BOT_TOKEN",
  "DISCORD_BOT_TOKEN",
  "SLACK_BOT_TOKEN",
  "INSTAGRAM_ACCESS_TOKEN",
  "GITHUB_ACCESS_TOKEN",
]);

function isValidUserId(userId) {
  return /^[\w.-]+$/.test(userId) && !userId.includes("..");
}

function isValidTenantId(tenantId) {
  return /^[\w.-]+$/.test(tenantId) && !tenantId.includes("..");
}

export function createHermesWorkspaceService({ rootDir }) {
  function resolveWorkspace({ userId, tenantId }) {
    if (!isValidUserId(userId) || !isValidTenantId(tenantId)) {
      throw new Error("Invalid workspace: traversal detected");
    }
    const homeDir = path.join(rootDir, tenantId, userId);
    return {
      homeDir,
      cacheDir: path.join(homeDir, "cache"),
      skillsDir: path.join(homeDir, "skills"),
      memoryDir: path.join(homeDir, "memory"),
      sessionsDir: path.join(homeDir, "sessions"),
      logsDir: path.join(homeDir, "logs"),
      artifactsDir: path.join(homeDir, "artifacts"),
      env: {
        HERMES_HOME: homeDir,
        HERMES_CACHE_DIR: path.join(homeDir, "cache"),
      },
    };
  }

  function buildHermesEnv({ workspace, baseEnv = {} }) {
    const env = { ...baseEnv };
    env.HERMES_HOME = workspace.homeDir;
    env.HERMES_CACHE_DIR = workspace.cacheDir;
    for (const key of DANGEROUS_ENV_KEYS) {
      delete env[key];
    }
    return env;
  }

  return { resolveWorkspace, buildHermesEnv };
}
