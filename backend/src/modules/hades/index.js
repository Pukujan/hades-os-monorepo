import { createHadesRoutes } from "./routes/hades.routes.js";
import { createHadesRepository } from "./repositories/hades.repository.js";
import { createHermesService } from "./services/hermes.service.js";
import { createHermesRuntimeService } from "./services/hermesRuntime.service.js";
import { createHadesService } from "./services/hades.service.js";
import { getHadesConfig } from "./config/index.js";
import { createDiscordHermesCommandFlow } from "./services/discordHermesCommandFlow.service.js";
import { createMinionAssignmentRuntime } from "./services/minionAssignmentRuntime.service.js";
import { createGiphyProvider } from "./services/giphyProvider.service.js";
import { createTelegramClient } from "./services/telegramClient.js";
import { createBotTokenProvider } from "./services/botTokenProvider.js";

export async function register(app, context) {
  const config = getHadesConfig();
  const repository = createHadesRepository();
  const hermesRuntime = createHermesRuntimeService();
  const hermes = createHermesService({ hermesRuntime });

  let giphyProvider = null;
  try {
    giphyProvider = config.giphyApiKey ? createGiphyProvider({ apiKey: config.giphyApiKey }) : null;
  } catch { giphyProvider = null; }

  let telegramClient = null;
  try {
    telegramClient = config.telegramBotToken
      ? await createTelegramClient({ botToken: config.telegramBotToken })
      : null;
  } catch { telegramClient = null; }

  const botTokenProvider = createBotTokenProvider({
    findSocialConnection: async () => null,
  });

  const minionAssignmentRuntime = createMinionAssignmentRuntime({
    verifySocialAccount: null,
    repository,
    hermesRuntime: null,
    socialClient: null,
  });
  const service = createHadesService({ repository, hermes, config, minionAssignmentRuntime, context });
  const router = createHadesRoutes({ service });

  app.use("/api/hades", router);

  return {
    detail: "→ /api/hades",
    children: [
      { id: "hades", role: "api", mount: "/api/hades" },
      ...(telegramClient ? [{ id: "telegram", role: "messaging", provider: "telegram" }] : []),
    ]
  };
}
