import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";

const handoffPath = join(
  process.cwd(),
  "work-log",
  "handoffs",
  "010_2026-06-17_handoff_hades-extension-install-and-design.md",
);

describe("Hades extension install and design handoff contract", () => {
  test("handoff exists and contains OpenCode build contract plus ChatGPT design contract", () => {
    assert.equal(
      existsSync(handoffPath),
      true,
      "Missing extension install/design handoff for OpenCode and ChatGPT.",
    );

    const handoff = readFileSync(handoffPath, "utf8");

    for (const required of [
      "OpenCode Build Contract",
      "ChatGPT Extension-Only Design Contract",
      "OpenCode Socials UI Contract",
      "API Contracts",
      "Data Contracts",
      "Screens To Design",
      "States To Design",
      "Download extension",
      "Generate new API key",
      "Copy API key",
      "GET /api/hades/extension/download",
      "POST /api/hades/extension/keys",
      "GET /api/hades/extension/keys",
      "POST /api/hades/extension/keys/:id/rotate",
      "POST /api/hades/extension/keys/:id/revoke",
      "GET /api/hades/extension/workflows",
      "POST /api/hades/extension/chat",
      "POST /api/hades/extension/documents",
      "POST /api/hades/extension/page-context",
      "POST /api/hades/extension/approvals/:id/decision",
      "Figma-style output",
      "React component map",
      "Mobile extension side panel",
      "Popup",
      "Extension API key paste/connect screen",
      "ChatGPT must not design the Socials UI install card",
    ]) {
      assert.ok(handoff.includes(required), `Handoff missing required section/token: ${required}`);
    }
  });
});
