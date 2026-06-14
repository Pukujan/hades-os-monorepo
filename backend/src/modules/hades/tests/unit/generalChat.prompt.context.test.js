import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGeneralChatPrompt } from "../../prompts/generalChatPrompt.js";

test("instructs Hermes to resolve references from recent General chat history", () => {
  const prompt = buildGeneralChatPrompt({ routes: [] });

  assert.match(prompt, /Topic Reference Tracking/);
  assert.match(prompt, /Use recent General chat history/);
  assert.match(prompt, /him/);
  assert.match(prompt, /her/);
  assert.match(prompt, /it/);
  assert.match(prompt, /that/);
  assert.match(prompt, /Do not assume vague references mean Hades/);
  assert.match(prompt, /Do not use Forge history in General chat/);
});
