import { createHadesRoutes } from "./routes/hades.routes.js";
import { createHadesRepository } from "./repositories/hades.repository.js";
import { createHermesService } from "./services/hermes.service.js";
import { createPrivateAiClient } from "./services/privateAiClient.js";
import { createHadesService } from "./services/hades.service.js";
import { getHadesConfig } from "./config/index.js";

export function register(app, context) {
  const config = getHadesConfig();
  const repository = createHadesRepository();
  const privateAiClient = createPrivateAiClient({
    baseUrl: config.privateAiBaseUrl,
    apiKey: config.privateAiApiKey
  });
  const hermes = createHermesService({ config, privateAiClient });
  const service = createHadesService({ repository, hermes, context });
  const router = createHadesRoutes({ service });

  app.use("/api/hades", router);

  return {
    detail: "→ /api/hades",
    children: [{ id: "hades", role: "api", mount: "/api/hades" }]
  };
}

