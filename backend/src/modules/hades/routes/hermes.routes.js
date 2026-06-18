import { Router } from "express";

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function createHermesRoutes({
  config,
  processManager,
  stateRepository,
} = {}) {
  const router = Router();

  const runtimeMode = process.env.HERMES_RUNTIME_MODE || "oneshot";
  const workspaceRoot = process.env.HERMES_HOME || config?.hermesHome || ".hermes-home";
  const storeMode = config?.readiness?.storage?.mode || "memory";

  let lastRunAt = null;
  let totalRuns = 0;

  function resolveAuth(req) {
    if (req.authContext) {
      return {
        userId: req.authContext.userId,
        tenantId: req.authContext.tenantId,
      };
    }
    return {
      userId: req.headers["x-user-id"] || "e2e-test-user",
      tenantId: req.headers["x-tenant-id"] || "e2e-test-tenant",
    };
  }

  router.get(
    "/status",
    asyncRoute(async (req, res) => {
      res.status(200).json({
        runtimeMode,
        workspaceRoot,
        stateStore: storeMode,
        objectStore: storeMode,
        lastRunAt,
        activeRuntimes: totalRuns > 0 ? 1 : 0,
        totalRuns,
      });
    })
  );

  router.post(
    "/tasks",
    asyncRoute(async (req, res) => {
      const { message } = req.body;
      const { userId, tenantId } = resolveAuth(req);

      const result = await processManager.runTask({ userId, tenantId, message });

      totalRuns++;
      lastRunAt = new Date().toISOString();

      res.status(200).json({
        taskId: result.taskId,
        routingTokenStatus: "issued",
        reply: result.reply,
        assistantText: result.reply,
        status: "completed",
      });
    })
  );

  router.get(
    "/state",
    asyncRoute(async (req, res) => {
      const { userId, tenantId } = resolveAuth(req);
      const objects = stateRepository
        ? await stateRepository.listStateObjects({ userId, tenantId })
        : [];

      const sanitized = objects.map((obj) => ({
        objectKey: obj.object_key || obj.objectKey,
        contentHash: obj.content_hash || obj.contentHash,
      }));

      res.status(200).json({ objects: sanitized });
    })
  );

  router.get(
    "/skills",
    asyncRoute(async (req, res) => {
      res.status(200).json({ skills: [] });
    })
  );

  return router;
}
