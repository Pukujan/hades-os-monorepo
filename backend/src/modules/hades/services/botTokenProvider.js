const CACHE_TTL_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

export function createBotTokenProvider({ findSocialConnection } = {}) {
  if (typeof findSocialConnection !== "function") {
    throw new Error("findSocialConnection is not configured");
  }

  const cache = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (now - entry.timestamp > CACHE_TTL_MS) {
        cache.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  if (cleanup.unref) cleanup.unref();

  function cacheKey({ userId, provider }) {
    return `${userId}|${provider}`;
  }

  async function getBotToken({ userId, provider } = {}) {
    const key = cacheKey({ userId, provider });
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.value;
    }

    const connection = await findSocialConnection({ userId, provider });
    const result = !connection || !connection.botToken ? null : connection.botToken;

    cache.set(key, { value: result, timestamp: Date.now() });
    return result;
  }

  return { getBotToken };
}
