import { Router } from "express";

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

const BROWSER_SAFE_KEYS = new Set(["supabaseUrl", "supabaseAnonKey"]);

function pickPublicAuthConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  };
}

export function createAuthRoutes() {
  const router = Router();

  router.get(
    "/browser-config",
    asyncRoute(async (_req, res) => {
      res.status(200).json(pickPublicAuthConfig());
    })
  );

  return router;
}
