export function getHadesConfig() {
  return {
    privateAiBaseUrl: process.env.PRIVATE_AI_BASE_URL || "",
    privateAiApiKey: process.env.PRIVATE_AI_API_KEY || "",
    hermesMode: process.env.HERMES_MODE || "private_ai_with_fallback",
    userId: process.env.HADES_USER_ID || "local-user"
  };
}

