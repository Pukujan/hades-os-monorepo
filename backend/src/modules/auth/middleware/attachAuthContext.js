import { verifySupabaseSession } from "../services/verifySupabaseSession.js";

export function createAttachAuthContextMiddleware({
  verifySession = verifySupabaseSession
} = {}) {
  return async function attachAuthContext(req, _res, next) {
    try {
      req.authContext = await verifySession(req.headers);
      if (!req.authContext) {
        console.warn("[auth] attachAuthContext: verifySession returned null — request will be rejected");
      }
      next();
    } catch (_error) {
      console.warn("[auth] attachAuthContext: verifySession threw:", _error?.message || _error);
      req.authContext = null;
      next();
    }
  };
}
