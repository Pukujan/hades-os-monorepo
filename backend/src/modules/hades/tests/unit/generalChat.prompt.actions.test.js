import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGeneralChatPrompt } from "../../prompts/generalChatPrompt.js";

test("instructs Hermes to use structured actions for buttons and links", () => {
  const prompt = buildGeneralChatPrompt({
    routes: [
      {
        label: "Forge",
        path: "/app/forge",
        description: "Create, refine, test, and save minions.",
        keywords: ["forge"],
      },
    ],
  });

  assert.match(prompt, /Temporary Chat Actions/);
  assert.match(prompt, /external_link/);
  assert.match(prompt, /route/);
  assert.match(prompt, /Do not return HTML buttons/);
  assert.match(prompt, /\/app\/forge/);
});
