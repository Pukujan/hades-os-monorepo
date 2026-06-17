const TENOR_UNAVAILABLE_TOKENS = ["content unavailable", "content_unavailable"];
const DEFAULT_TIMEOUT_MS = 5_000;

export function createMediaUrlVerifier({ fetch: fetchFn } = {}) {
  const httpFetch = fetchFn || globalThis.fetch;

  return {
    async verifyMediaUrl({ url, allowedContentTypes = ["image/gif", "image/webp"], timeoutMs = DEFAULT_TIMEOUT_MS }) {
      if (!url.startsWith("https://")) {
        return { ok: false, url, reason: "non_https_url" };
      }

      let response;
      try {
        response = await httpFetch(url, {
          method: "HEAD",
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        return { ok: false, url, reason: "fetch_failed" };
      }

      if (!response.ok) {
        return { ok: false, url, reason: "http_error" };
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.startsWith("text/html")) {
        const body = await response.text();
        const lower = body.toLowerCase();
        const unavailable = TENOR_UNAVAILABLE_TOKENS.some((t) => lower.includes(t));
        return unavailable
          ? { ok: false, url, reason: "content_unavailable" }
          : { ok: false, url, reason: "unsupported_content_type" };
      }

      const isAllowed = allowedContentTypes.some((allowed) => contentType.startsWith(allowed));
      if (!isAllowed) {
        return { ok: false, url, reason: "unsupported_content_type" };
      }

      return { ok: true, url, contentType };
    },
  };
}
