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

function resolveExtensionAuth(scopedRepos) {
  return async function requireExtensionAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ code: "missing_extension_key" });
    }
    const plaintextKey = authHeader.slice("Bearer ".length).trim();
    if (!plaintextKey) {
      return res.status(401).json({ code: "missing_extension_key" });
    }
    const authContext = await scopedRepos.extensionKeys.verifyKey({
      plaintextKey,
      requiredScope: "workflow:read",
    });
    if (!authContext) {
      return res.status(401).json({ code: "invalid_extension_key" });
    }
    req.authContext = authContext;
    next();
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
        return res.status(404).json({ code: "not_found" });
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

  router.post(
    "/socials/slack/token",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.saveSlackToken(req.body, req.authContext);
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

  router.post(
    "/socials/instagram/connect",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.createInstagramAuthLink(req.body, req.authContext);
      res.status(200).json(result);
    })
  );

  router.post(
    "/socials/instagram/connection",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.saveInstagramConnection(req.body, req.authContext);
      res.status(200).json(result);
    })
  );

  router.delete(
    "/socials/instagram/connection",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.deleteInstagramConnection(req.authContext);
      res.status(200).json(result);
    })
  );

  router.post(
    "/triggers/instagram",
    asyncRoute(async (req, res) => {
      try {
        const result = await service.handleInstagramWebhook(req.body, req.headers);
        res.status(200).json(result);
      } catch (err) {
        const status = err.status || 400;
        res.status(status).json({ code: err.code || "error", error: err.message });
      }
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

  const requireExtensionAuth = scopedRepos?.extensionKeys ? resolveExtensionAuth(scopedRepos) : null;

  router.get(
    "/extension/download",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.downloadExtensionBundle(req.authContext);
      res.setHeader("content-type", result.contentType);
      res.setHeader("content-disposition", `attachment; filename="${result.filename}"`);
      res.end(result.buffer);
    })
  );

  router.post(
    "/extension/keys",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.createExtensionKey(req.body, req.authContext);
      res.status(201).json(result);
    })
  );

  router.get(
    "/extension/keys",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.listExtensionKeys(req.authContext);
      res.status(200).json(result);
    })
  );

  router.post(
    "/extension/keys/:id/rotate",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.rotateExtensionKey(req.params.id, req.authContext);
      res.status(200).json(result);
    })
  );

  router.post(
    "/extension/keys/:id/revoke",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.revokeExtensionKey(req.params.id, req.authContext);
      res.status(200).json(result);
    })
  );

  router.get(
    "/extension/workflows",
    requireExtensionAuth || requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.listExtensionWorkflows(req.authContext);
      res.status(200).json(result);
    })
  );

  router.post(
    "/extension/chat",
    requireExtensionAuth || requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.extensionChat(req.body, req.authContext);
      res.status(200).json(result);
    })
  );

  router.get(
    "/extension/minions",
    requireExtensionAuth || requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.listExtensionMinions(req.authContext);
      res.status(200).json(result);
    })
  );

  router.post(
    "/extension/minions",
    requireExtensionAuth || requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.saveExtensionMinion(req.body, req.authContext);
      res.status(201).json(result);
    })
  );

  router.post(
    "/extension/documents",
    requireExtensionAuth || requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.uploadExtensionDocument(req.body, req.authContext);
      res.status(201).json(result);
    })
  );

  router.get(
    "/extension/documents",
    requireExtensionAuth || requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.listExtensionDocuments(req.authContext);
      res.status(200).json(result);
    })
  );

  router.post(
    "/extension/context-spaces",
    requireExtensionAuth || requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.saveExtensionContextSpace(req.body, req.authContext);
      res.status(201).json(result);
    })
  );

  router.get(
    "/extension/context-spaces",
    requireExtensionAuth || requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.listExtensionContextSpaces(req.authContext);
      res.status(200).json(result);
    })
  );

  router.post(
    "/extension/page-capture",
    requireExtensionAuth || requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.saveExtensionPageCapture(req.body, req.authContext);
      res.status(201).json(result);
    })
  );

  router.get(
    "/extension/page-capture",
    requireExtensionAuth || requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.listExtensionPageCaptures(req.authContext);
      res.status(200).json(result);
    })
  );

  router.get(
    "/extension/approvals",
    requireExtensionAuth || requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.listExtensionApprovals(req.authContext);
      res.status(200).json(result);
    })
  );

  router.post(
    "/extension/approvals",
    requireExtensionAuth || requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.saveExtensionApproval(req.body, req.authContext);
      res.status(201).json(result);
    })
  );

  router.post(
    "/extension/approvals/:id/decision",
    requireExtensionAuth || requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.decideExtensionApproval(req.params.id, req.body, req.authContext);
      res.status(200).json(result);
    })
  );

  router.post(
    "/workflows",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.createWorkflow(req.body, req.authContext);
      res.status(201).json(result);
    })
  );

  router.get(
    "/workflows",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.listWorkflows(req.authContext);
      res.status(200).json(result);
    })
  );

  router.post(
    "/workflows/:id/execute",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.executeWorkflow(req.params.id, req.body, req.authContext);
      res.status(201).json(result);
    })
  );

  router.get(
    "/workflows/:id/runs",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.listWorkflowRuns(req.params.id, req.authContext);
      res.status(200).json(result);
    })
  );

  router.get(
    "/workflows/:id",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.findWorkflowDefinition(req.params.id, req.authContext);
      res.status(200).json(result);
    })
  );

  router.patch(
    "/workflows/:id",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.updateWorkflow(req.params.id, req.body, req.authContext);
      res.status(200).json(result);
    })
  );

  router.delete(
    "/workflows/:id",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await service.deleteWorkflow(req.params.id, req.authContext);
      res.status(200).json(result);
    })
  );

  return router;
}
