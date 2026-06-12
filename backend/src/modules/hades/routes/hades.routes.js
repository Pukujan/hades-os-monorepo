import { Router } from "express";

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function createHadesRoutes({ service }) {
  const router = Router();

  router.get(
    "/readiness",
    asyncRoute(async (req, res) => {
      const result = await service.readiness();
      res.status(200).json(result);
    })
  );

  router.get(
    "/bootstrap",
    asyncRoute(async (req, res) => {
      const result = await service.bootstrap({
        conversationId: typeof req.query.conversationId === "string" ? req.query.conversationId : null
      });
      res.status(200).json(result);
    })
  );

  router.post(
    "/chat",
    asyncRoute(async (req, res) => {
      const result = await service.chat(req.body);
      res.status(200).json(result);
    })
  );

  router.post(
    "/minions/test",
    asyncRoute(async (req, res) => {
      const result = await service.testMinion(req.body);
      res.status(201).json(result);
    })
  );

  router.post(
    "/minions",
    asyncRoute(async (req, res) => {
      const result = await service.saveMinion(req.body);
      res.status(201).json(result);
    })
  );

  router.post(
    "/assignments",
    asyncRoute(async (req, res) => {
      const result = await service.assignMinion(req.body);
      res.status(201).json(result);
    })
  );

  return router;
}
