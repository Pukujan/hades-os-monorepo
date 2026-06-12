import { createHadesRoutes } from "./routes/hades.routes.js";
import { createHadesRepository } from "./repositories/hades.repository.js";
import { createHermesService } from "./services/hermes.service.js";
import { createHermesRuntimeService } from "./services/hermesRuntime.service.js";
import { createHadesService } from "./services/hades.service.js";
import { getHadesConfig } from "./config/index.js";

export function register(app, context) {
  const config = getHadesConfig();
  const repository = createHadesRepository();
  const hermesRuntime = createHermesRuntimeService();
  const hermes = createHermesService({ hermesRuntime });
  const service = createHadesService({ repository, hermes, config, context });
  const router = createHadesRoutes({ service });

  app.use("/api/hades", router);

  return {
    detail: "→ /api/hades",
    children: [{ id: "hades", role: "api", mount: "/api/hades" }]
  };
}
