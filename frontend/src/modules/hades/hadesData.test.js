import assert from "node:assert/strict";
import { test } from "node:test";
import { THEME_CHOICES, getSocialIcon } from "./hadesData.js";

test("theme picker keeps only the core forge themes", () => {
  const ids = THEME_CHOICES.map((choice) => choice.id);

  assert.deepEqual(ids, ["ember", "arcane", "grove"]);
  assert.equal(THEME_CHOICES.find((choice) => choice.id === "ember")?.label, "Ember Forge");
  assert.equal(THEME_CHOICES.find((choice) => choice.id === "grove")?.description, "Green nature realm.");
});

test("social providers resolve to stable icon names", () => {
  assert.equal(getSocialIcon("discord"), "discord");
  assert.equal(getSocialIcon("telegram"), "telegram");
  assert.equal(getSocialIcon("github"), "github");
  assert.equal(getSocialIcon("email"), "email");
  assert.equal(getSocialIcon("private"), "private");
});
