import { Router } from "express";
import { AppError } from "../../../shared/http/errors.js";

export function createModelCondenserRoutes({ config, modelCondenser }) {
  const router = Router();

  router.post("/condense", async (req, res, next) => {
    try {
      const includePayload = Boolean(req.body?.includePayload);
      const result = await modelCondenser.condense({
        includePayload
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/consolidated", async (req, res, next) => {
    try {
      const includePayload = req.query.includePayload === "true";
      const summary = await modelCondenser.getStatus();

      if (!summary.exists) {
        throw new AppError(
          "Consolidated models file not found. POST /api/model-condenser/condense first.",
          404
        );
      }

      if (!includePayload) {
        res.json(summary);
        return;
      }

      const consolidated = await modelCondenser.readConsolidated();
      res.json({ ...summary, consolidated });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
