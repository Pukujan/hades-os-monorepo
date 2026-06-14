import express from "express";
import cors from "cors";
import { loadModules } from "./module-loader.js";
import { errorHandler } from "../shared/http/errors.js";

export async function createApp({ overrides = {} } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  const loadedModules = await loadModules(app, overrides);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", loadedAt: new Date().toISOString() });
  });

  app.use(errorHandler);

  return { app, loadedModules };
}
