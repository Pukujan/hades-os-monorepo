const DEFAULTS = {
  retries: 2,
  minDelay: 200,
  maxDelay: 2_000,
};

function isRetryableResponse(result) {
  if (result && typeof result.ok === "boolean" && !result.ok) {
    return result.status === 429 || (result.status >= 500 && result.status < 600);
  }
  return false;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function withRetry(fn, options = {}) {
  const { retries, minDelay, maxDelay } = { ...DEFAULTS, ...options };

  return async (...args) => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await fn(...args);
        if (isRetryableResponse(result)) {
          throw Object.assign(
            new Error(`Retryable HTTP ${result.status}`),
            { status: result.status, retryable: true }
          );
        }
        return result;
      } catch (err) {
        lastError = err;
        if (!err.retryable && err.status && err.status < 500 && err.status !== 429) {
          throw err;
        }
        if (attempt >= retries) {
          throw err;
        }
        const backoff = Math.min(minDelay * Math.pow(2, attempt), maxDelay);
        const jittered = backoff * (0.5 + Math.random() * 0.5);
        await delay(jittered);
      }
    }
    throw lastError;
  };
}
