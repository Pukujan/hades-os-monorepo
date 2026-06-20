import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.resolve(DIR, "../../pages/HadesPrototypeApp.jsx");

describe("Hermes conversation continuity", () => {
  test("HadesProvider persists previous Hermes response id across refresh", () => {
    const source = readFileSync(APP_PATH, "utf8");

    assert.ok(
      source.includes('usePersistentState(scopedStorageKey("hades.previousResponseId"), null)'),
      "previousResponseId must be account-scoped persistent state, not volatile React state.",
    );
  });

  test("Hermes responses use a named conversation instead of null conversation", () => {
    const source = readFileSync(APP_PATH, "utf8");

    assert.doesNotMatch(source, /conversation:\s*null/);
    assert.ok(
      source.includes("hermesConversationKey"),
      "sendHermesResponse must pass a stable Hermes conversation key.",
    );
  });
});
