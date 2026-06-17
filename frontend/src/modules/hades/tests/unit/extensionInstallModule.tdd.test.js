import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.resolve(DIR, "../../pages/HadesPrototypeApp.jsx");

async function loadModule(modulePath, message) {
  try {
    return await import(modulePath);
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND") {
      throw error;
    }
    throw new Error(message);
  }
}

describe("Hades extension install frontend module TDD contract", () => {
  test("extension install API client exposes key lifecycle and extension download endpoints", async () => {
    const api = await loadModule(
      "../../extension/services/extensionInstallApi.js",
      "Missing frontend Hades extension install API client module.",
    );

    assert.equal(typeof api.listExtensionApiKeys, "function");
    assert.equal(typeof api.generateExtensionApiKey, "function");
    assert.equal(typeof api.rotateExtensionApiKey, "function");
    assert.equal(typeof api.revokeExtensionApiKey, "function");
    assert.equal(typeof api.downloadExtensionBundle, "function");
    assert.equal(typeof api.buildExtensionDownloadUrl, "function");

    assert.equal(api.buildExtensionDownloadUrl(), "/api/hades/extension/download");
    assert.deepEqual(api.EXTENSION_API_CONTRACT.endpoints, {
      listKeys: "GET /api/hades/extension/keys",
      createKey: "POST /api/hades/extension/keys",
      rotateKey: "POST /api/hades/extension/keys/:id/rotate",
      revokeKey: "POST /api/hades/extension/keys/:id/revoke",
      downloadBundle: "GET /api/hades/extension/download",
    });
  });

  test("extension install view model shows generate, copy, rotate, revoke, and download actions", async () => {
    const { buildExtensionInstallPanelState } = await loadModule(
      "../../extension/utils/extensionInstallViewModel.js",
      "Missing extension install view model for Socials UI.",
    );

    const state = buildExtensionInstallPanelState({
      keys: [
        {
          id: "key-1",
          name: "Chrome extension",
          scopes: ["workflow:read", "document:upload"],
          secretPreview: "hades_ext_...1234",
          revokedAt: null,
        },
      ],
      latestCreatedSecret: "hades_ext_live_secret_once",
      bundleStatus: "ready",
    });

    assert.equal(state.providerId, "hades-browser-extension");
    assert.equal(state.primaryActions.generateKey.label, "Generate new API key");
    assert.equal(state.primaryActions.copySecret.label, "Copy API key");
    assert.equal(state.primaryActions.downloadExtension.label, "Download extension");
    assert.equal(state.primaryActions.downloadExtension.href, "/api/hades/extension/download");
    assert.equal(state.keys[0].secretVisible, false);
    assert.equal(state.keys[0].canRotate, true);
    assert.equal(state.keys[0].canRevoke, true);
    assert.equal(state.latestCreatedSecret.visibleOnce, true);
  });

  test("Socials UI imports and renders ExtensionInstallCard as the browser extension setup module", () => {
    const source = readFileSync(APP_PATH, "utf8");

    assert.ok(
      source.includes('import { ExtensionInstallCard } from'),
      "HadesPrototypeApp must import ExtensionInstallCard.",
    );
    assert.ok(
      source.includes("<ExtensionInstallCard"),
      "Socials UI must render the extension install card.",
    );
    assert.ok(
      source.includes("hades-browser-extension"),
      "Socials UI must identify the extension setup module with provider id hades-browser-extension.",
    );
  });

  test("ExtensionInstallCard source exposes key generation, copy, rotate, revoke, and download controls", () => {
    const cardPath = path.resolve(DIR, "../../extension/components/ExtensionInstallCard.jsx");
    const source = readFileSync(cardPath, "utf8");

    for (const requiredCopy of [
      "Generate new API key",
      "Copy API key",
      "Rotate",
      "Revoke",
      "Download extension",
    ]) {
      assert.ok(source.includes(requiredCopy), `ExtensionInstallCard missing required control copy: ${requiredCopy}`);
    }

    for (const requiredHook of [
      "generateExtensionApiKey",
      "listExtensionApiKeys",
      "rotateExtensionApiKey",
      "revokeExtensionApiKey",
      "navigator.clipboard.writeText",
      "latestCreatedSecret",
    ]) {
      assert.ok(source.includes(requiredHook), `ExtensionInstallCard missing required behavior hook: ${requiredHook}`);
    }
  });
});
