import { Router } from "express";
import { createHealthRoutes } from "./health.routes.js";
import { createModelCondenserRoutes } from "./modelCondenser.routes.js";

export function createModuleRouter({ config, modelCondenser }) {
  const router = Router();
  router.use(createHealthRoutes({ config }));
  router.use(createModelCondenserRoutes({ config, modelCondenser }));
  return router;
}
