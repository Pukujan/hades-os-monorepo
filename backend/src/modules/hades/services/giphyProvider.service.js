const GIPHY_API_BASE = "https://api.giphy.com/v1/gifs";

function ensureFunction(fn, label) {
  if (typeof fn !== "function") {
    throw new Error(`${label} is not configured`);
  }
  return fn;
}

export function createGiphyProvider({ apiKey, fetch: fetchFn } = {}) {
  if (!apiKey) {
    throw new Error("Giphy API key is missing or not configured");
  }

  const httpFetch = fetchFn || globalThis.fetch;

  async function searchGif({ query, rating = "pg-13", limit = 1 } = {}) {
    const url = `${GIPHY_API_BASE}/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&rating=${encodeURIComponent(rating)}&limit=${Math.min(limit, 50)}`;

    const response = await httpFetch(url);

    if (!response.ok) {
      throw new Error(`Giphy API error: ${response.status}`);
    }

    const body = await response.json();
    if (!body.data || body.data.length === 0) {
      return null;
    }

    const gif = body.data[0];
    return {
      id: gif.id,
      url: gif.url,
      title: gif.title,
    };
  }

  return { searchGif };
}
