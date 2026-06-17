import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.resolve(DIR, "../../pages/HadesPrototypeApp.jsx");

describe("Instagram social connector frontend contract", () => {
  test("SOCIAL_LINKS includes Instagram as a connectable social channel", async () => {
    const { SOCIAL_LINKS, formatSocialLabel, getSocialIcon } = await import("../../utils/hadesData.js");

    const instagram = SOCIAL_LINKS.find((social) => social.provider === "instagram");
    assert.ok(instagram, "Socials UI must include Instagram.");
    assert.equal(instagram.id, "instagram");
    assert.equal(instagram.displayName, "Instagram");
    assert.equal(instagram.status, "not_connected");
    assert.equal(formatSocialLabel("instagram"), "Instagram");
    assert.equal(getSocialIcon("instagram"), "instagram");
  });

  test("Hades API client exposes authenticated Instagram connect lifecycle calls", async () => {
    const api = await import("../../services/hadesApi.js");

    assert.equal(typeof api.createInstagramAuthLink, "function");
    assert.equal(typeof api.saveInstagramConnection, "function");
    assert.equal(typeof api.deleteInstagramConnection, "function");
  });

  test("Instagram connect lifecycle calls use /api/hades/socials/instagram routes with auth", async () => {
    const calls = [];
    const originalFetch = globalThis.fetch;
    globalThis.importMetaEnvShim = {
      MODE: "development",
      VITE_API_BASE_URL: "",
    };
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ provider: "instagram", status: "connected" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      const api = await import("../../services/hadesApi.js");

      await api.createInstagramAuthLink({
        connector: "composio",
        requestedScopes: ["instagram.dm.read", "instagram.dm.send"],
      }, "access-token-1");
      await api.saveInstagramConnection({
        connector: "composio",
        externalConnectionId: "composio-conn-1",
      }, "access-token-1");
      await api.deleteInstagramConnection("access-token-1");

      assert.equal(calls[0].url, "/api/hades/socials/instagram/connect");
      assert.equal(calls[0].options.method, "POST");
      assert.equal(calls[0].options.headers.authorization, "Bearer access-token-1");

      assert.equal(calls[1].url, "/api/hades/socials/instagram/connection");
      assert.equal(calls[1].options.method, "POST");

      assert.equal(calls[2].url, "/api/hades/socials/instagram/connection");
      assert.equal(calls[2].options.method, "DELETE");
    } finally {
      globalThis.fetch = originalFetch;
      delete globalThis.importMetaEnvShim;
    }
  });

  test("Socials UI imports and renders InstagramSetupCard", () => {
    const source = readFileSync(APP_PATH, "utf8");

    assert.ok(
      source.includes('import { InstagramSetupCard } from'),
      "HadesPrototypeApp must import InstagramSetupCard.",
    );
    assert.ok(
      source.includes("<InstagramSetupCard"),
      "Socials UI must render the Instagram setup card.",
    );
    assert.ok(
      source.includes("handleCreateInstagramAuthLink"),
      "Socials UI must provide an Instagram auth-link handler.",
    );
  });
});
