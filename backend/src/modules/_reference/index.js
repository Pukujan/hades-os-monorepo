import { createModuleRouter } from "./routes/index.js";
import { registerModuleEvents } from "./events/index.js";
import { moduleConfig } from "./config/index.js";

export function register(app, context) {
  const router = createModuleRouter({ config: moduleConfig, context });
  app.use("/api/_reference", router);
  registerModuleEvents(context);
}
