import assert from "node:assert/strict";
import { test } from "node:test";
import { THEME_CHOICES } from "./hadesData.js";

test("theme picker includes the core forge theme plus pastel and professional variants", () => {
  const ids = THEME_CHOICES.map((choice) => choice.id);

  assert.deepEqual(ids, ["ember", "arcane", "grove", "petal", "coast", "slate"]);
  assert.equal(THEME_CHOICES.find((choice) => choice.id === "petal")?.label, "Petal Mist");
  assert.equal(THEME_CHOICES.find((choice) => choice.id === "slate")?.description, "Clean professional navy and slate.");
});
