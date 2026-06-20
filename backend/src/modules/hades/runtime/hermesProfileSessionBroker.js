import { randomUUID } from "node:crypto";

export function createHermesProfileSessionBroker({ auth, profileRegistry, profileRouter, routingToken, profileGatewayManager } = {}) {
  async function startSession({ supabaseJwt, origin } = {}) {
    const identity = await auth.verifySupabaseJwt(supabaseJwt);
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
      const gateway = await profileGatewayManager.ensureGateway(gatewayRequest);
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
