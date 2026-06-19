export function createHermesProfileSessionBroker({ auth, profileRegistry, profileRouter, routingToken } = {}) {
  async function startSession({ supabaseJwt } = {}) {
    const identity = await auth.verifySupabaseJwt(supabaseJwt);
    const profile = await profileRegistry.ensureProfile({
      userId: identity.userId,
      tenantId: identity.tenantId,
    });

    const route = await profileRouter.publicRouteForProfile({
      profileName: profile.profileName,
    });

    const token = await routingToken.issueTask({
      userId: identity.userId,
      tenantId: identity.tenantId,
      profileName: profile.profileName,
    });

    return {
      profileName: profile.profileName,
      hermesApiBaseUrl: route.hermesApiBaseUrl,
      authMode: route.authMode || "edge_injected",
      routingToken: token.routingToken,
    };
  }

  return { startSession };
}
