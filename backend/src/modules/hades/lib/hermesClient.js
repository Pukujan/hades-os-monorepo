const DEFAULT_TIMEOUT_MS = 15_000;

export function createHermesClient({
  baseUrl,
  apiKey,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (!baseUrl) throw new Error("hermesClient: baseUrl is required");
  if (!apiKey) throw new Error("hermesClient: apiKey is required");

  async function request(path, { method = "POST", headers = {}, body, signal } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const combinedSignal = signal
      ? combineAbortSignals(signal, controller.signal)
      : controller.signal;

    try {
      const res = await fetchImpl(`${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\//, "")}`, {
        method,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: combinedSignal,
      });

      const contentType = res.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

      if (!res.ok) {
        const err = new Error(`Hermes API ${res.status}: ${res.statusText}`);
        err.status = res.status;
        err.payload = payload;
        throw err;
      }

      return payload;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    chat(input, opts = {}) {
      return request("/v1/chat/completions", { body: input, ...opts });
    },
    responses(input, opts = {}) {
      return request("/v1/responses", { body: input, ...opts });
    },
    requestRaw(path, opts = {}) {
      return request(path, opts);
    },
  };
}

function combineAbortSignals(...signals) {
  const controller = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort(sig.reason);
      return controller.signal;
    }
    sig.addEventListener("abort", () => controller.abort(sig.reason), { once: true });
  }
  return controller.signal;
}
