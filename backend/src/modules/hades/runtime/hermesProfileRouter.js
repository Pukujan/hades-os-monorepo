export function createHermesProfileRouter({ publicBaseUrl = "", registry } = {}) {
  async function publicRouteForProfile({ profileName, origin } = {}) {
    const base = effectivePublicUrl(origin);
    return {
      hermesApiBaseUrl: `${base.replace(/\/+$/, "")}/${profileName}/v1`,
      authMode: "edge_injected",
    };
  }

  function effectivePublicUrl(origin) {
    if (!publicBaseUrl.startsWith("/")) return publicBaseUrl;
    if (origin) return `${origin.replace(/\/+$/, "")}${publicBaseUrl}`;
    const railDomain = process.env.RAILWAY_PUBLIC_DOMAIN || "";
    if (railDomain) return `https://${railDomain}${publicBaseUrl}`;
    const reqHost = process.env.HADES_PUBLIC_HOST || "";
    if (reqHost) return `https://${reqHost}${publicBaseUrl}`;
    return publicBaseUrl;
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
