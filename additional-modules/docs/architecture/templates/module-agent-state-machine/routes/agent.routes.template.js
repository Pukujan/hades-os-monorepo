/**
 * Template — merge into backend/src/modules/<module>/routes/
 * Contract: moduleAgentStateMachine v001
 */
import { Router } from "express";

/**
 * @param {object} options
 * @param {ReturnType<import("../services/agent-runner.service.js").createAgentRunnerService>} options.agentRunner
 */
export function createAgentRoutes({ agentRunner }) {
  const router = Router();

  router.post("/agents/:agentId/runs", async (req, res, next) => {
    try {
      const snapshot = await agentRunner.start(req.params.agentId, req.body ?? {});
      res.status(201).json(snapshot);
    } catch (error) {
      next(error);
    }
  });

  router.post("/agents/runs/:runId/events", async (req, res, next) => {
    try {
      const { type, payload } = req.body ?? {};
      if (!type) return res.status(400).json({ error: "type is required" });
      const snapshot = await agentRunner.send(req.params.runId, type, payload);
      res.json(snapshot);
    } catch (error) {
      next(error);
    }
  });

  router.get("/agents/runs/:runId", async (req, res, next) => {
    try {
      const snapshot = await agentRunner.getSnapshot(req.params.runId);
      res.json(snapshot);
    } catch (error) {
      next(error);
    }
  });

  router.post("/agents/runs/:runId/cancel", async (req, res, next) => {
    try {
      const snapshot = await agentRunner.send(req.params.runId, "CANCEL");
      res.json(snapshot);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
