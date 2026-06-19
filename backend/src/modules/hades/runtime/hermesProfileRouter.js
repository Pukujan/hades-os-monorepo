export function createHermesProfileRouter({ publicBaseUrl = "", registry } = {}) {
  const railDomain = process.env.RAILWAY_PUBLIC_DOMAIN || "";
  const effectivePublicUrl = publicBaseUrl.startsWith("/") && railDomain
    ? `https://${railDomain}${publicBaseUrl}`
    : publicBaseUrl;

  async function publicRouteForProfile({ profileName }) {
    return {
      hermesApiBaseUrl: `${effectivePublicUrl.replace(/\/+$/, "")}/${profileName}/v1`,
      authMode: "edge_injected",
    };
  }

  async function internalTargetForProfile({ profileName }) {
    const profile = await registry.findProfile({ profileName });
    if (!profile) throw new Error(`Profile not found: ${profileName}`);
    return {
      baseUrl: `http://${profile.apiHost}:${profile.apiPort}`,
      apiServerKeyHash: profile.apiServerKeyHash,
    };
  }

  return { publicRouteForProfile, internalTargetForProfile };
}
