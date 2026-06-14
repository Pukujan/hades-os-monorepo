import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGeneralChatPrompt } from "../generalChatPrompt.js";
import { HADES_APP_ROUTES } from "../../hadesAppContext.js";

test("includes soul and General mode scope", () => {
  const prompt = buildGeneralChatPrompt({
    routes: [
      { label: "Socials", path: "/app/socials", keywords: ["telegram"] },
      { label: "Forge", path: "/app/forge", keywords: ["make minion"] },
    ],
  });

  assert.match(prompt, /Hades is the quiet command layer/);
  assert.match(prompt, /Current Mode: General Hades Chat/);
  assert.match(prompt, /Stay inside General chat scope/);
  assert.match(prompt, /\/app\/socials/);
  assert.match(prompt, /\/app\/forge/);
});

test("does not force customer support personality", () => {
  const prompt = buildGeneralChatPrompt({ routes: [] });

  assert.match(prompt, /Do not force a helpful assistant personality/);
  assert.match(prompt, /Use the Hades soul/);
});

test("keeps minion creation out of General chat", () => {
  const prompt = buildGeneralChatPrompt({ routes: [] });

  assert.match(prompt, /do not start the forging process here/);
  assert.match(prompt, /route them to Forge/);
});

test("includes topic reference tracking instruction", () => {
  const prompt = buildGeneralChatPrompt({ routes: [] });

  assert.match(prompt, /Topic Reference Tracking/);
  assert.match(prompt, /Use recent General chat history/);
  assert.match(prompt, /Do not use Forge history in General chat/);
});

test("includes temporary chat actions instruction", () => {
  const prompt = buildGeneralChatPrompt({ routes: [] });

  assert.match(prompt, /Temporary Chat Actions/);
  assert.match(prompt, /external_link/);
  assert.match(prompt, /Max 3 actions/);
});

test("includes voice continuity for tool results", () => {
  const prompt = buildGeneralChatPrompt({ routes: [] });

  assert.match(prompt, /Voice Continuity/);
  assert.match(prompt, /You are still Hades/);
  assert.match(prompt, /Do not become a generic assistant/);
  assert.match(prompt, /not generic shopping assistant/);
});

test("includes structured results instruction to avoid Markdown tables", () => {
  const prompt = buildGeneralChatPrompt({ routes: [] });

  assert.match(prompt, /Structured Results/);
  assert.match(prompt, /Do not use Markdown tables/);
  assert.match(prompt, /product_result/);
  assert.match(prompt, /comparison_row/);
});

test("returns structured action format instruction", () => {
  const prompt = buildGeneralChatPrompt({ routes: HADES_APP_ROUTES });

  assert.match(prompt, /reply/);
  assert.match(prompt, /actions/);
  assert.match(prompt, /action objects/);
});

test("returns a string", () => {
  const prompt = buildGeneralChatPrompt({ routes: HADES_APP_ROUTES });

  assert.equal(typeof prompt, "string");
  assert.ok(prompt.length > 100);
});
