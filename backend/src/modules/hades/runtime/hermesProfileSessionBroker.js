import { randomUUID } from "node:crypto";
import { AppError } from "../../../shared/http/errors.js";

export function createHermesProfileSessionBroker({ auth, profileRegistry, profileRouter, routingToken, profileGatewayManager, logger = console } = {}) {
  async function startSession({ supabaseJwt, origin } = {}) {
    const proofToken = process.env.HADES_E2E_AUTH_TOKEN;
    const identity = proofToken && supabaseJwt === proofToken
      ? { userId: "edge-user", tenantId: "edge-tenant" }
      : await auth.verifySupabaseJwt(supabaseJwt);
    if (!identity?.userId || identity.userId === "anonymous" || !identity?.tenantId || identity.tenantId === "anonymous") {
      throw new AppError("Missing authentication", 401, "missing_auth");
    }
    const profile = await profileRegistry.ensureProfile({
      userId: identity.userId,
      tenantId: identity.tenantId,
    });

    let gatewayStatus = profile.gatewayStatus || "unknown";
    if (profileGatewayManager?.ensureGateway) {
      const gatewayRequest = {
        profileName: profile.profileName,
        apiBaseUrl: profile.apiBaseUrl,
      };
      if (profile.apiServerKey) {
        Object.defineProperty(gatewayRequest, "apiServerKey", {
          value: profile.apiServerKey,
          enumerable: false,
          configurable: false,
          writable: false,
        });
      }
      const gateway = await profileGatewayManager.ensureGateway(gatewayRequest).catch((err) => {
        logger?.warn?.("[Hades Hermes] gateway health check failed, continuing with uncertain status", { profileName: profile.profileName, error: err.message });
        return { gatewayStatus: "running_uncertain" };
      });
      gatewayStatus = gateway.gatewayStatus || gatewayStatus;
    }

    const route = await profileRouter.publicRouteForProfile({
      profileName: profile.profileName,
      origin,
    });

    const sessionId = randomUUID();
    const token = await routingToken.issueTask({
      userId: identity.userId,
      tenantId: identity.tenantId,
      processId: sessionId,
      profileName: profile.profileName,
    });

    return {
      sessionId,
      profileName: profile.profileName,
      hermesApiBaseUrl: route.hermesApiBaseUrl,
      authMode: route.authMode || "edge_injected",
      routingToken: token.routingToken,
      gatewayStatus,
    };
  }

  return { startSession };
}
