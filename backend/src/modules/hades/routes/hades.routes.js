import { Router } from "express";

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function createAuthGuard(requireHadesAuth) {
  if (typeof requireHadesAuth !== "function") {
    return function passThroughAuth(req, _res, next) {
      if (!req.authContext) {
        _res.status(401).json({ code: "missing_auth" });
        return;
      }
      next();
    };
  }

  return function requireAuth(req, res, next) {
    requireHadesAuth(req, { supabaseAuth: { getUserFromToken: async () => req.authContext } })
      .then((authCtx) => {
        req.authContext = authCtx;
        next();
      })
      .catch((err) => {
        const code = err.code || "missing_auth";
        res.status(401).json({ code });
      });
  };
}

export function createHadesRoutes({ service, requireHadesAuth, config, scopedRepos } = {}) {
  const router = Router();
  const requireAuth = createAuthGuard(requireHadesAuth);

  router.get(
    "/readiness",
    asyncRoute(async (req, res) => {
      const result = await service.readiness();
      res.status(200).json(result);
    })
  );

  router.get(
    "/bootstrap",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.bootstrap({
        conversationId: typeof req.query.conversationId === "string" ? req.query.conversationId : null,
      }, req.authContext);
      result.authContext = { userId: req.authContext.userId, tenantId: req.authContext.tenantId };
      res.status(200).json(result);
    })
  );

  router.post(
    "/chat/general",
    requireAuth,
    asyncRoute(async (req, res) => {
      const body = { ...req.body, conversationType: "general" };
      const result = await service.chat(body, req.authContext);
      result.authContext = { userId: req.authContext.userId, tenantId: req.authContext.tenantId };
      res.status(200).json(result);
    })
  );

  router.post(
    "/chat/forge",
    requireAuth,
    asyncRoute(async (req, res) => {
      const body = { ...req.body, conversationType: "forge" };
      const result = await service.chat(body, req.authContext);
      result.authContext = { userId: req.authContext.userId, tenantId: req.authContext.tenantId };
      res.status(200).json(result);
    })
  );

  router.post(
    "/chat",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.chat(req.body, req.authContext);
      result.authContext = { userId: req.authContext.userId, tenantId: req.authContext.tenantId };
      res.status(200).json(result);
    })
  );

  router.post(
    "/minions/test",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.testMinion(req.body, req.authContext);
      res.status(201).json(result);
    })
  );

  router.post(
    "/minions",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.saveMinion(req.body, req.authContext);
      res.status(201).json(result);
    })
  );

  router.post(
    "/assignments",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.assignMinion(req.body, req.authContext);
      res.status(201).json(result);
    })
  );

  router.post(
    "/triggers/telegram/:userId",
    asyncRoute(async (req, res) => {
      try {
        const { userId } = req.params;
        const tenantId = req.query.tenantId || userId;
        const result = await service.handleTelegramWebhook({ update: req.body, userId, tenantId });
        res.status(200).json(result);
      } catch (err) {
        const status = err.status || 400;
        res.status(status).json({ code: err.code || "error", error: err.message });
      }
    })
  );

  router.post(
    "/triggers",
    asyncRoute(async (req, res) => {
      try {
        const result = await service.handleTrigger(req.body, req.authContext || null);
        res.status(200).json(result);
      } catch (err) {
        const status = err.status || (err.code === "unknown_social_account" ? 404 : 400);
        res.status(status).json({ code: err.code || "error", error: err.message });
      }
    })
  );

  router.get(
    "/conversations/:id/messages",
    requireAuth,
    asyncRoute(async (req, res) => {
      const messages = await service.getConversationMessages(req.params.id, req.authContext);
      if (messages === null) {
        return res.status(404).json({ code: "not_found" });
      }
      res.status(200).json({ messages });
    })
  );

  router.delete(
    "/conversations/:id/messages",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.clearMessages(req.params.id, req.authContext);
      if (result === null) {
        return res.status(200).json({ cleared: true, stale: true });
      }
      res.status(200).json(result);
    })
  );

  router.get(
    "/socials",
    requireAuth,
    asyncRoute(async (req, res) => {
      const socials = await service.listSocialConnections(req.authContext);
      res.status(200).json(socials);
    })
  );

  router.post(
    "/socials/telegram/token",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.saveTelegramToken(req.body, req.authContext);
      res.status(200).json(result);
    })
  );

  router.post(
    "/socials/discord/token",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.saveDiscordToken(req.body, req.authContext);
      res.status(200).json(result);
    })
  );

  router.post(
    "/socials/github/token",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.saveGitHubToken(req.body, req.authContext);
      res.status(200).json(result);
    })
  );

  router.delete(
    "/socials/telegram/token",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.deleteTelegramToken(req.authContext);
      res.status(200).json(result);
    })
  );

  router.get(
    "/minions",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.listMinions(req.authContext);
      res.status(200).json(result);
    })
  );

  router.get(
    "/minions/:id",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.getMinion(req.params.id, req.authContext);
      res.status(200).json(result);
    })
  );

  router.get(
    "/minions/:id/logs",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.getMinionLogs(req.params.id, req.authContext);
      res.status(200).json(result);
    })
  );

  router.get(
    "/notifications",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.listNotifications(req.authContext);
      res.status(200).json(result);
    })
  );

  router.patch(
    "/minions/:id",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.updateMinion(req.params.id, req.body, req.authContext);
      res.status(200).json(result);
    })
  );

  router.delete(
    "/minions/:id",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.deleteMinion(req.params.id, req.authContext);
      res.status(200).json(result);
    })
  );

  return router;
}
