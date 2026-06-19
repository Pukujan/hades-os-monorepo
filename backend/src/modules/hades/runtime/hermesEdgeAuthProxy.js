export function createHermesEdgeAuthProxy({ auth, profileRouter, apiServerKeyVault, fetch: fetcher } = {}) {
  async function forward({ profileName, path, method, headers, body } = {}) {
    await auth.verifyEdgeRequest({ headers, profileName });

    const internalTarget = await profileRouter.internalTargetForProfile({ profileName });
    const apiServerKey = await apiServerKeyVault.getApiServerKey({ profileName });

    const upstreamHeaders = { ...headers };
    delete upstreamHeaders.authorization;
    delete upstreamHeaders.Authorization;

    upstreamHeaders.authorization = `Bearer ${apiServerKey}`;

    const url = `${internalTarget.baseUrl.replace(/\/+$/, "")}/${path.replace(/^\//, "")}`;

    try {
      const upstreamInit = {
        method: method || "GET",
        headers: upstreamHeaders,
        ...(body ? { body } : {}),
      };

      const upstreamResponse = await fetcher(url, upstreamInit);

      const bodyText = typeof upstreamResponse.body === "string"
        ? upstreamResponse.body
        : await upstreamResponse.text();

      return {
        status: upstreamResponse.status,
        headers: upstreamResponse.headers instanceof Map
          ? Object.fromEntries(upstreamResponse.headers)
          : upstreamResponse.headers,
        body: bodyText,
      };
    } catch {
      return {
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "edge_ready", profileName, note: "profile API server not yet running" }),
      };
    }
  }

  return { forward };
}
