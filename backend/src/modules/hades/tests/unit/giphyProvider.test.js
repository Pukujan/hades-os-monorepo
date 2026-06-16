import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadGiphyProvider() {
  try {
    return await import("../../services/giphyProvider.service.js");
  } catch (error) {
    throw new Error(
      [
        "Missing Giphy provider service.",
        "Implement backend/src/modules/hades/services/giphyProvider.service.js",
        "and export { createGiphyProvider }.",
      ].join(" "),
      { cause: error }
    );
  }
}

describe("Giphy provider", () => {
  test("searchGif returns a GIF result with id, url, and title", async () => {
    const { createGiphyProvider } = await loadGiphyProvider();
    assert.equal(typeof createGiphyProvider, "function");

    const provider = createGiphyProvider({
      apiKey: "test-key",
      fetch: async () => ({
        ok: true,
        json: async () => ({
          data: [{
            id: "gif_1",
            url: "https://giphy.com/test",
            title: "Test GIF",
          }],
        }),
      }),
    });

    const result = await provider.searchGif({
      query: "cat meme",
      rating: "pg-13",
      limit: 1,
    });

    assert.ok(result.id, "Result should have an id");
    assert.equal(result.id, "gif_1");
    assert.ok(result.url, "Result should have a url");
    assert.equal(result.url, "https://giphy.com/test");
    assert.ok(result.title, "Result should have a title");
    assert.equal(result.title, "Test GIF");
  });

  test("searchGif passes rating and limit to the API", async () => {
    const { createGiphyProvider } = await loadGiphyProvider();

    const requests = [];
    const provider = createGiphyProvider({
      apiKey: "test-key",
      fetch: async (url) => {
        requests.push(url);
        return {
          ok: true,
          json: async () => ({
            data: [{ id: "gif_1", url: "https://giphy.com/test", title: "Test" }],
          }),
        };
      },
    });

    await provider.searchGif({ query: "cat", rating: "g", limit: 5 });
    assert.equal(requests.length, 1);
    assert.ok(requests[0].includes("rating=g"), "Should pass rating param");
    assert.ok(requests[0].includes("limit=5"), "Should pass limit param");
    assert.ok(requests[0].includes("api_key=test-key"), "Should pass API key");
  });

  test("searchGif fails gracefully when the API returns an error", async () => {
    const { createGiphyProvider } = await loadGiphyProvider();

    const provider = createGiphyProvider({
      apiKey: "test-key",
      fetch: async () => ({ ok: false, status: 400 }),
    });

    await assert.rejects(
      () => provider.searchGif({ query: "cat", rating: "pg-13", limit: 1 }),
      /Giphy API error/i
    );
  });

  test("searchGif fails when API key is missing", async () => {
    const { createGiphyProvider } = await loadGiphyProvider();

    assert.throws(
      () => createGiphyProvider({ apiKey: "" }),
      /api.key|configured|missing/i
    );
  });

  test("searchGif returns null when no results found", async () => {
    const { createGiphyProvider } = await loadGiphyProvider();

    const provider = createGiphyProvider({
      apiKey: "test-key",
      fetch: async () => ({
        ok: true,
        json: async () => ({ data: [] }),
      }),
    });

    const result = await provider.searchGif({ query: "xyznonexistent", rating: "pg-13", limit: 1 });
    assert.equal(result, null);
  });
});
