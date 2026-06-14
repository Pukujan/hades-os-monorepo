import { test } from "node:test";
import assert from "node:assert/strict";
import { buildForgeChatPrompt } from "../forgeChatPrompt.js";

test("includes soul and Forge mode scope", () => {
  const prompt = buildForgeChatPrompt();

  assert.match(prompt, /Hades is the quiet command layer/);
  assert.match(prompt, /Current Mode: Hermes Forge/);
  assert.match(prompt, /Forge is the only place where minions are created/);
  assert.match(prompt, /Stay inside Forge scope/);
});

test("keeps General context out of Forge", () => {
  const prompt = buildForgeChatPrompt();

  assert.match(prompt, /must not/);
  assert.match(prompt, /use General chat messages as Forge context/);
});

test("returns a string", () => {
  const prompt = buildForgeChatPrompt();

  assert.equal(typeof prompt, "string");
  assert.ok(prompt.length > 50);
});
