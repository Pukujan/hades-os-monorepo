function isProduction() {
  return (process.env.NODE_ENV || "").toLowerCase() === "production";
}

function buildReadiness() {
  const storageConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const aiConfigured = Boolean(process.env.OPENROUTER_API_KEY);

  return {
    status: "ok",
    mode: isProduction() ? "hosted" : "local",
    storage: {
      mode: storageConfigured ? "supabase" : "memory",
      configured: storageConfigured
    },
    ai: {
      provider: "openrouter",
      model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash",
      configured: aiConfigured
    },
    cors: {
      origin: process.env.CORS_ORIGIN || null
    },
    deploy: {
      backendPlatform: "railway",
      frontendPlatform: "vercel"
    }
  };
}

export function getHadesConfig() {
  return {
    openRouterBaseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
    openRouterModel: process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash",
    openRouterHttpReferer: process.env.OPENROUTER_HTTP_REFERER || "",
    openRouterAppTitle: process.env.OPENROUTER_APP_TITLE || "Hades OS",
    hermesRequired: process.env.HERMES_REQUIRED !== "false",
    hermesBinPath: process.env.HERMES_BIN_PATH || "",
    hermesHome: process.env.HERMES_HOME || "",
    giphyApiKey: process.env.GIPHY_API_KEY || "",
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
    readiness: buildReadiness()
  };
}
