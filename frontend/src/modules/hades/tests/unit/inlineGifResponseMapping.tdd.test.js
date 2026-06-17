import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../../pages/HadesPrototypeApp.jsx", import.meta.url), "utf8");

test("Hades chat response mapping preserves verified inline GIF media fields", () => {
  for (const requiredField of [
    "gifUrl",
    "mediaUrl",
    "mediaType",
    "mediaAlt",
    "mediaVerificationStatus",
    "mediaVerificationReason",
  ]) {
    assert.match(
      source,
      new RegExp(`${requiredField}:\\s*response\\.assistantMessage\\?\\.${requiredField}`),
      `HadesPrototypeApp response mapping must preserve assistantMessage.${requiredField}.`,
    );
  }
});
