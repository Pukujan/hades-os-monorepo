export function createHermesEdgeAuthProxy({ auth, profileRouter, apiServerKeyVault, fetch: fetcher } = {}) {
  async function forward({ profileName, path, method, headers, body } = {}) {
    await auth.verifyEdgeRequest({ headers, profileName });

    const internalTarget = await profileRouter.internalTargetForProfile({ profileName });
    const apiServerKey = await apiServerKeyVault.getApiServerKey({ profileName });
    if (!apiServerKey) {
      return {
        status: 503,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: "profile_api_key_unavailable", profileName }),
      };
    }

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
        headers: typeof upstreamResponse.headers?.entries === "function"
          ? Object.fromEntries(upstreamResponse.headers.entries())
          : upstreamResponse.headers,
        body: bodyText,
      };
    } catch (error) {
      return {
        status: 503,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          error: "profile_api_unavailable",
          profileName,
          message: error?.message || "Hermes profile API server is unavailable.",
        }),
      };
    }
  }

  return { forward };
}
