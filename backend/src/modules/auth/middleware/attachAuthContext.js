import { verifySupabaseSession } from "../services/verifySupabaseSession.js";

export function createAttachAuthContextMiddleware({
  verifySession = verifySupabaseSession
} = {}) {
  return async function attachAuthContext(req, _res, next) {
    try {
      req.authContext = await verifySession(req.headers);
      next();
    } catch (_error) {
      req.authContext = null;
      next();
    }
  };
}
