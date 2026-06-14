import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGeneralChatPrompt } from "../../prompts/generalChatPrompt.js";

test("tells Hermes to use cards instead of Markdown tables", () => {
  const prompt = buildGeneralChatPrompt({ routes: [] });

  assert.match(prompt, /Do not use Markdown tables/);
  assert.match(prompt, /return `cards`/);
  assert.match(prompt, /product_result/);
  assert.match(prompt, /comparison_row/);
});
