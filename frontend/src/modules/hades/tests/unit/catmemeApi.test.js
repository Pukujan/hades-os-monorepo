import { test } from "node:test";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("catmeme API functions", () => {
  test("generateCatMeme is exported as a function", async () => {
    const mod = await import("../../services/hadesApi.js");
    assert.equal(typeof mod.generateCatMeme, "function");
  });

  test("generateCatMeme posts prompt and returns meme data", async () => {
    globalThis.importMetaEnvShim = { VITE_API_BASE_URL: "" };
    globalThis.fetch = async (url, options) => {
      assert.ok(url.endsWith("/api/hades/catmeme/generate"));
      assert.equal(options.method, "POST");
      const body = JSON.parse(options.body);
      assert.equal(body.prompt, "funny cat with hat");
      return {
        ok: true,
        async text() {
          return JSON.stringify({
            id: "meme_1",
            prompt: "funny cat with hat",
            imageUrl: "https://example.com/meme.jpg",
            caption: "I can has cheezburger?",
          });
        },
      };
    };

    const mod = await import("../../services/hadesApi.js");
    const result = await mod.generateCatMeme("funny cat with hat");
    assert.equal(result.prompt, "funny cat with hat");
    assert.ok(result.imageUrl);
    assert.ok(result.caption);
  });

  test("getCatMemeTemplates is exported as a function", async () => {
    const mod = await import("../../services/hadesApi.js");
    assert.equal(typeof mod.getCatMemeTemplates, "function");
  });

  test("getCatMemeTemplates returns list of meme templates", async () => {
    globalThis.importMetaEnvShim = { VITE_API_BASE_URL: "" };
    globalThis.fetch = async (url) => {
      assert.ok(url.endsWith("/api/hades/catmeme/templates"));
      return {
        ok: true,
        async text() {
          return JSON.stringify([
            { id: "t1", name: "Grumpy Cat", previewUrl: "https://example.com/grumpy.jpg" },
            { id: "t2", name: "Surprised Cat", previewUrl: "https://example.com/surprised.jpg" },
          ]);
        },
      };
    };

    const mod = await import("../../services/hadesApi.js");
    const result = await mod.getCatMemeTemplates();
    assert.equal(result.length, 2);
    assert.equal(result[0].name, "Grumpy Cat");
  });
});
