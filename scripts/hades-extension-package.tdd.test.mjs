import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const extensionRoot = join(repoRoot, "extension");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("Hades browser extension package TDD contract", () => {
  test("phase 11: extension package exists as a separate workspace client", () => {
    const packagePath = join(extensionRoot, "package.json");
    const manifestPath = join(extensionRoot, "public", "manifest.json");

    assert.equal(
      existsSync(packagePath),
      true,
      "Missing extension/package.json. Expected a separate browser extension package in this repo.",
    );
    assert.equal(
      existsSync(manifestPath),
      true,
      "Missing extension/public/manifest.json. Expected a browser extension manifest.",
    );

    const packageJson = readJson(packagePath);
    const manifest = readJson(manifestPath);

    assert.equal(packageJson.private, true);
    assert.ok(packageJson.scripts?.build);
    assert.equal(manifest.manifest_version, 3);
    assert.ok(manifest.permissions.includes("storage"));
    assert.ok(manifest.permissions.includes("activeTab"));
  });

  test("phase 11: extension exposes chat, workflow list, uploads, text spaces, page capture, and approval surfaces", () => {
    const expectedFiles = [
      "src/surfaces/HadesExtensionApp.jsx",
      "src/surfaces/HadesChatPanel.jsx",
      "src/surfaces/WorkflowListPanel.jsx",
      "src/surfaces/ContextUploadPanel.jsx",
      "src/surfaces/TextContextSpacesPanel.jsx",
      "src/surfaces/PageCapturePanel.jsx",
      "src/surfaces/ApprovalQueuePanel.jsx",
    ];

    for (const file of expectedFiles) {
      assert.equal(
        existsSync(join(extensionRoot, file)),
        true,
        `Missing extension/${file}. Expected extension surface for workflow-oriented Hades usage.`,
      );
    }
  });

  test("phase 12: extension stores only the user-generated API key locally and calls scoped backend APIs", () => {
    const clientPath = join(extensionRoot, "src", "api", "hadesExtensionClient.js");
    assert.equal(
      existsSync(clientPath),
      true,
      "Missing extension/src/api/hadesExtensionClient.js. Expected extension API client.",
    );

    const source = readFileSync(clientPath, "utf8");
    assert.match(source, /chrome\.storage\.local|browser\.storage\.local/);
    assert.match(source, /Authorization/);
    assert.match(source, /Bearer/);
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE|OPENROUTER_API_KEY|HERMES_API_KEY/);
    assert.match(source, /\/api\/hades\/extension\//);
  });
});
