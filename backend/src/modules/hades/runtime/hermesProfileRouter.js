export function createHermesProfileRouter({ publicBaseUrl = "", registry } = {}) {
  async function publicRouteForProfile({ profileName }) {
    return {
      hermesApiBaseUrl: `${publicBaseUrl.replace(/\/+$/, "")}/${profileName}/v1`,
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
