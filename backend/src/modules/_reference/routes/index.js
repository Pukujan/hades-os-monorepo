import { Router } from "express";
import { createHealthRoutes } from "./health.routes.js";

export function createModuleRouter({ config, context }) {
  const router = Router();
  router.use(createHealthRoutes({ config, context }));
  return router;
}
