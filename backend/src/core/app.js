import express from "express";
import { loadModules } from "./module-loader.js";
import { errorHandler } from "../shared/http/errors.js";
import { createCorsMiddleware } from "../modules/hades/services/cors.js";

export async function createApp({ overrides = {} } = {}) {
  const app = express();
  app.use(createCorsMiddleware(process.env.CORS_ORIGIN));
  app.use(express.json({ limit: "10mb" }));

  const loadedModules = await loadModules(app, overrides);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", loadedAt: new Date().toISOString() });
  });

  app.use(errorHandler);

  return { app, loadedModules };
}
