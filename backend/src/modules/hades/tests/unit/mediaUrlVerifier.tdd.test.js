import { describe, test } from "node:test";
import assert from "node:assert/strict";

const TENOR_CONTENT_UNAVAILABLE_URL = "https://media1.tenor.com/m/-DoRykX0LwcAAAAd/anime-girl-dark-hair.gif";

async function loadMediaUrlVerifier() {
  try {
    return await import("../../services/mediaUrlVerifier.js");
  } catch (error) {
    throw new Error(
      [
        "Missing media URL verifier.",
        "Implement backend/src/modules/hades/services/mediaUrlVerifier.js",
        "and export { createMediaUrlVerifier } so Hermes verifies GIF/media URLs before Discord or chat UI use them."
      ].join(" "),
      { cause: error }
    );
  }
}

describe("Hades media URL verifier", () => {
  test("accepts a reachable HTTPS image/gif URL using a HEAD request", async () => {
    const { createMediaUrlVerifier } = await loadMediaUrlVerifier();
    assert.equal(typeof createMediaUrlVerifier, "function");

    const calls = [];
    const verifier = createMediaUrlVerifier({
      fetch: async (url, options) => {
        calls.push({ url, options });
        return {
          ok: true,
          status: 200,
          headers: new Headers({
            "content-type": "image/gif",
            "content-length": "48123"
          }),
          text: async () => ""
        };
      }
    });

    const result = await verifier.verifyMediaUrl({
      url: "https://media.example.com/cat.gif",
      allowedContentTypes: ["image/gif", "image/webp"],
      timeoutMs: 1000
    });

    assert.equal(result.ok, true);
    assert.equal(result.url, "https://media.example.com/cat.gif");
    assert.equal(result.contentType, "image/gif");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.method, "HEAD");
  });

  test("rejects Tenor content-unavailable HTML even when the URL ends in .gif", async () => {
    const { createMediaUrlVerifier } = await loadMediaUrlVerifier();

    const verifier = createMediaUrlVerifier({
      fetch: async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
        text: async () => "<html><title>Content Unavailable</title><body>Content Unavailable</body></html>"
      })
    });

    const result = await verifier.verifyMediaUrl({
      url: TENOR_CONTENT_UNAVAILABLE_URL,
      allowedContentTypes: ["image/gif"]
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "content_unavailable");
    assert.equal(result.url, TENOR_CONTENT_UNAVAILABLE_URL);
  });

  test("rejects non-HTTPS URLs and non-image responses", async () => {
    const { createMediaUrlVerifier } = await loadMediaUrlVerifier();

    const verifier = createMediaUrlVerifier({
      fetch: async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => "{\"not\":\"media\"}"
      })
    });

    const insecure = await verifier.verifyMediaUrl({
      url: "http://media.example.com/cat.gif",
      allowedContentTypes: ["image/gif"]
    });
    assert.equal(insecure.ok, false);
    assert.equal(insecure.reason, "non_https_url");

    const wrongType = await verifier.verifyMediaUrl({
      url: "https://media.example.com/not-a-gif",
      allowedContentTypes: ["image/gif"]
    });
    assert.equal(wrongType.ok, false);
    assert.equal(wrongType.reason, "unsupported_content_type");
  });
});
