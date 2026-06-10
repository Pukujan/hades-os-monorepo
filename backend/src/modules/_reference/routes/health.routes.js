import { Router } from "express";
import { getHealth } from "../services/health.service.js";

export function createHealthRoutes({ config }) {
  const router = Router();
  router.get("/health", (_req, res) => {
    res.json(getHealth(config));
  });
  return router;
}
