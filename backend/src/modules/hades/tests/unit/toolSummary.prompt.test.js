import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGeneralChatPrompt } from "../../prompts/generalChatPrompt.js";

test("keeps Hades voice after tool/search/product results", () => {
  const prompt = buildGeneralChatPrompt({ routes: [] });

  assert.match(prompt, /You are still Hades/);
  assert.match(prompt, /The fact that tools were used does not change/);
  assert.match(prompt, /Do not become a generic assistant/);
  assert.match(prompt, /not generic shopping assistant/);
});

test("does not use generic shopping assistant opener after tool results", () => {
  const prompt = buildGeneralChatPrompt({ routes: [] });

  assert.match(prompt, /Do not say "Here you go"/);
});
