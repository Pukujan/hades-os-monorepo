import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSoul } from "../../souls/loadSoul.js";

test("loads Hades soul markdown with core identity", () => {
  const soul = loadSoul("hades");

  assert.match(soul, /Hades is the quiet command layer/);
  assert.match(soul, /not eager to help/);
  assert.match(soul, /A little contempt is allowed/);
});

test("defines scope boundaries", () => {
  const soul = loadSoul("hades");

  assert.match(soul, /General chat uses General context/);
  assert.match(soul, /Forge chat uses Forge context/);
  assert.match(soul, /General chat must not receive Forge messages/);
  assert.match(soul, /Forge chat must not receive General messages/);
});

test("allows dry, superior, reluctant tone", () => {
  const soul = loadSoul("hades");

  assert.match(soul, /dry/);
  assert.match(soul, /superior/);
  assert.match(soul, /mildly dismissive/);
  assert.match(soul, /reluctant/);
});
