import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";

import { extractLoginTemplateParts } from "./loginTemplateParts.js";

test("login template keeps the approved forge portal structure", () => {
  const template = fs.readFileSync(new URL("./loginTemplate.html", import.meta.url), "utf8");
  const parts = extractLoginTemplateParts(template);

  assert.equal(parts.frames.length, 3);
  assert.match(parts.body, /HADES OS/);
  assert.match(parts.body, /START THE FORGE/);
  assert.match(parts.body, /Continue with Discord/);
  assert.equal(parts.style, "");
});
