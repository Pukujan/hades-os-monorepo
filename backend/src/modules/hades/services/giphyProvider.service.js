import { withRetry } from "../utils/withRetry.js";

const GIPHY_API_BASE = "https://api.giphy.com/v1/gifs";
const CACHE_TTL_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

export function createGiphyProvider({ apiKey, fetch: fetchFn } = {}) {
  if (!apiKey) {
    throw new Error("Giphy API key is missing or not configured");
  }

  const httpFetch = fetchFn || globalThis.fetch;
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

  function cacheKey({ query, rating, limit }) {
    return `${query}|${rating}|${limit}`;
  }

  async function searchGif({ query, rating = "pg-13", limit = 1 } = {}) {
    const key = cacheKey({ query, rating, limit });
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.value;
    }

    const url = `${GIPHY_API_BASE}/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&rating=${encodeURIComponent(rating)}&limit=${Math.min(limit, 50)}`;

    const response = await httpFetch(url, { signal: AbortSignal.timeout(5_000) });

    if (!response.ok) {
      const err = new Error(`Giphy API error: ${response.status}`);
      err.status = response.status;
      throw err;
    }

    const body = await response.json();
    if (!body.data || body.data.length === 0) {
      return null;
    }

    const gif = body.data[0];
    const result = {
      id: gif.id,
      url: gif.images?.original?.url || gif.url,
      providerPageUrl: gif.url,
      title: gif.title,
    };

    cache.set(key, { value: result, timestamp: Date.now() });
    return result;
  }

  const searchGifWithRetry = withRetry(searchGif, { retries: 2 });

  return { searchGif: searchGifWithRetry };
}
