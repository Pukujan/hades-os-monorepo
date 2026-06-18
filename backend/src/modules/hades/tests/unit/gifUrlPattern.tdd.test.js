import { describe, test } from "node:test";
import assert from "node:assert/strict";

// The regex used in hermes.service.js for GIF URL matching
const GIF_URL_RE = /https:\/\/media\d*\.(?:tenor|giphy)\.com\/[^\s"'<>]+\.gif/gi;

// Test GIF URL patterns based on real observations
const WORKING_TENOR = "https://media.tenor.com/GVbImLIJa-sAAAAd/anime-purple.gif";
const FAILING_TENOR_MOBILE = "https://media1.tenor.com/m/_cP5qzJqBTsAAAAd/anime-girl-hades.gif";
const FAILING_TENOR_MOBILE2 = "https://media1.tenor.com/m/-DoRykX0LwcAAAAd/anime-girl-dark-hair.gif";
const GIPHY_DIRECT = "https://media.giphy.com/media/l0HlNQ03J5JxX6l9e/giphy.gif";
const IMGUR_DIRECT = "https://i.imgur.com/U2fg6lI.gif";

describe("GIF URL regex pattern matching", () => {
  test("matches working Tenor direct URL (no /m/)", () => {
    GIF_URL_RE.lastIndex = 0;
    const match = GIF_URL_RE.exec(WORKING_TENOR);
    assert.ok(match, "Regex should match direct Tenor URL");
    assert.equal(match[0], WORKING_TENOR);
  });

  test("matches Tenor mobile /m/ URL (media1 subdomain)", () => {
    GIF_URL_RE.lastIndex = 0;
    const match = GIF_URL_RE.exec(FAILING_TENOR_MOBILE);
    assert.ok(match, "Regex should match Tenor /m/ URL");
    assert.equal(match[0], FAILING_TENOR_MOBILE);
  });

  test("matches Tenor /m/ URL with different ID format", () => {
    GIF_URL_RE.lastIndex = 0;
    const match = GIF_URL_RE.exec(FAILING_TENOR_MOBILE2);
    assert.ok(match, "Regex should match second /m/ URL");
    assert.equal(match[0], FAILING_TENOR_MOBILE2);
  });

  test("matches Giphy direct URL", () => {
    GIF_URL_RE.lastIndex = 0;
    const match = GIF_URL_RE.exec(GIPHY_DIRECT);
    assert.ok(match, "Regex should match Giphy URL");
    assert.equal(match[0], GIPHY_DIRECT);
  });

  test("does NOT match Imgur URL (different domain)", () => {
    GIF_URL_RE.lastIndex = 0;
    GIF_URL_RE.exec(IMGUR_DIRECT);
    assert.equal(GIF_URL_RE.lastIndex, 0, "Regex should not match Imgur URLs");
  });

  test("matches multiple GIF URLs in a single text", () => {
    const text = `Here are two GIFs: ${WORKING_TENOR} and ${FAILING_TENOR_MOBILE}`;
    GIF_URL_RE.lastIndex = 0;
    const matches = [];
    let m;
    while ((m = GIF_URL_RE.exec(text)) !== null) {
      matches.push(m[0]);
    }
    assert.equal(matches.length, 2, "Should find both GIF URLs");
    assert.equal(matches[0], WORKING_TENOR);
    assert.equal(matches[1], FAILING_TENOR_MOBILE);
  });

  test("matches media0 through media9 subdomains", () => {
    const urls = [
      "https://media0.tenor.com/abc/test.gif",
      "https://media1.tenor.com/abc/test.gif",
      "https://media9.tenor.com/abc/test.gif",
      "https://media.tenor.com/abc/test.gif",
    ];
    for (const url of urls) {
      GIF_URL_RE.lastIndex = 0;
      const match = GIF_URL_RE.exec(url);
      assert.ok(match, `Should match ${url}`);
      assert.equal(match[0], url);
    }
  });

  test("rejects URLs without .gif extension", () => {
    const noExt = "https://media.tenor.com/abc/test";
    GIF_URL_RE.lastIndex = 0;
    const match = GIF_URL_RE.exec(noExt);
    assert.equal(match, null, "Should reject URLs without .gif extension");
  });
});

describe("GIF URL pattern analysis — /m/ segment theory", () => {
  test("working vs failing URLs differ by /m/ segment presence", () => {
    // Working: no /m/ in path
    assert.ok(!WORKING_TENOR.includes("/m/"), "Working URL should not contain /m/");
    // Failing: /m/ present
    assert.ok(FAILING_TENOR_MOBILE.includes("/m/"), "Failing URL should contain /m/");
    assert.ok(FAILING_TENOR_MOBILE2.includes("/m/"), "Second failing URL should contain /m/");
  });

  test("working vs failing URLs may differ by subdomain (media vs media1)", () => {
    // Working: media.tenor.com
    assert.ok(WORKING_TENOR.startsWith("https://media.tenor.com/"), "Working URL uses media subdomain");
    // Failing: media1.tenor.com
    assert.ok(FAILING_TENOR_MOBILE.startsWith("https://media1.tenor.com/"), "Failing URL uses media1 subdomain");
  });

  test("mediaUrlVerifier would reject /m/ URLs when Tenor returns HTML", async () => {
    const { createMediaUrlVerifier } = await import("../../services/mediaUrlVerifier.js");

    // Simulate Tenor's /m/ response: HTML with "Content Unavailable"
    const verifier = createMediaUrlVerifier({
      fetch: async (url) => {
        // Return HTML for /m/ URLs, real GIF for direct URLs
        if (url.includes("/m/")) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
            text: async () => "<html><title>Content Unavailable</title><body>Content Unavailable</body></html>",
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "image/gif" }),
          text: async () => "",
        };
      },
    });

    const directResult = await verifier.verifyMediaUrl({ url: WORKING_TENOR, allowedContentTypes: ["image/gif"] });
    assert.ok(directResult.ok, "Direct URL without /m/ should verify as valid GIF");

    const mobileResult = await verifier.verifyMediaUrl({ url: FAILING_TENOR_MOBILE, allowedContentTypes: ["image/gif"] });
    assert.equal(mobileResult.ok, false, "/m/ URL should be rejected");
    assert.equal(mobileResult.reason, "content_unavailable", "Should detect content_unavailable");

    const mobileResult2 = await verifier.verifyMediaUrl({ url: FAILING_TENOR_MOBILE2, allowedContentTypes: ["image/gif"] });
    assert.equal(mobileResult2.ok, false, "Second /m/ URL should also be rejected");
  });
});
