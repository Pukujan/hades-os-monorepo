import { createModuleRouter } from "./routes/index.js";
import { registerModuleEvents } from "./events/index.js";
import { getModuleConfig } from "./config/index.js";
import { createModelCondenserFacade } from "./services/modelCondenser.facade.js";

export function register(app, context) {
  const config = getModuleConfig();
  const modelCondenser = createModelCondenserFacade({ config });
  const router = createModuleRouter({ config, modelCondenser });
  app.use("/api/model-condenser", router);
  registerModuleEvents(context);
  return {
    detail: "→ /api/model-condenser",
    children: [{ id: "modelCondenser", role: "facade", mount: "/api/model-condenser" }]
  };
}
