import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";

const repoRoot = process.cwd();
const extensionRoot = join(repoRoot, "extension");
const designSourcePath = join(repoRoot, "file-exchange", "imports", "hades_extension_only_react_prototype.html");

function read(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

describe("Hades real browser extension build and download TDD contract", () => {
  test("ChatGPT extension-only prototype remains the required design source", () => {
    assert.equal(existsSync(designSourcePath), true, "Missing ChatGPT extension prototype in file-exchange/imports.");

    const source = read(designSourcePath);
    assert.match(source, /Extension-only React-style prototype/i);
    assert.match(source, /NO SOCIALS CARD/i);
    assert.match(source, /Extension API key/i);
    assert.match(source, /Approval queue/i);
    assert.match(source, /Page capture/i);
  });

  test("extension package has a real popup entrypoint matching the manifest", () => {
    const manifest = readJson(join(extensionRoot, "public", "manifest.json"));
    const popup = manifest.action?.default_popup;

    assert.equal(popup, "popup.html");
    assert.equal(
      existsSync(join(extensionRoot, "popup.html")),
      true,
      "Manifest points to popup.html, so extension/popup.html must exist.",
    );
    assert.equal(
      existsSync(join(extensionRoot, "src", "popup.jsx")),
      true,
      "Missing extension/src/popup.jsx React entrypoint.",
    );
    assert.match(read(join(extensionRoot, "popup.html")), /src\/popup\.jsx/);
  });

  test("extension React implementation imports the required design surfaces", () => {
    const appPath = join(extensionRoot, "src", "surfaces", "HadesExtensionApp.jsx");
    const appSource = read(appPath);

    for (const required of [
      "HadesChatPanel",
      "WorkflowListPanel",
      "ContextUploadPanel",
      "TextContextSpacesPanel",
      "PageCapturePanel",
      "ApprovalQueuePanel",
      "ExtensionConnectPanel",
      "Safety boundary",
      "submit",
      "approval",
    ]) {
      assert.ok(appSource.includes(required), `HadesExtensionApp missing design surface/copy: ${required}`);
    }
  });

  test("extension styling is implemented from the imported prototype, not just a heading", () => {
    const cssPath = join(extensionRoot, "src", "hades-extension.css");
    assert.equal(existsSync(cssPath), true, "Missing extension/src/hades-extension.css.");

    const css = read(cssPath);
    for (const token of ["--lime", "--mint", "--panel", ".popup-device", ".device", ".approval-card"]) {
      assert.ok(css.includes(token), `Extension CSS missing prototype token/class: ${token}`);
    }
  });

  test("extension package can produce the zip downloaded by the Hades backend", () => {
    const packageJson = readJson(join(extensionRoot, "package.json"));
    assert.ok(packageJson.scripts?.build, "extension/package.json must keep a build script.");
    assert.ok(packageJson.scripts?.package, "extension/package.json must add a package script that creates dist/extension.zip.");
    assert.equal(
      existsSync(join(repoRoot, "scripts", "package-hades-extension.mjs")),
      true,
      "Missing scripts/package-hades-extension.mjs.",
    );

    const zipPath = join(extensionRoot, "dist", "extension.zip");
    assert.equal(
      existsSync(zipPath),
      true,
      "Missing extension/dist/extension.zip. Run the extension package script before the backend download route can work.",
    );

    const header = readFileSync(zipPath).subarray(0, 2).toString("utf8");
    assert.equal(header, "PK", "extension/dist/extension.zip must be a real zip archive.");
  });
});
