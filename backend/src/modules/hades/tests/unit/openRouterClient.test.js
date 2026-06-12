import { test } from "node:test";
import assert from "node:assert/strict";
import { createOpenRouterClient } from "../../services/openRouterClient.js";
import { createEmptyDraft } from "../../data.js";

test("OpenRouter client posts to chat completions with the DeepSeek V4 Flash model", async () => {
  const calls = [];
  const client = createOpenRouterClient({
    apiKey: "or-test-key",
    model: "deepseek/deepseek-v4-flash",
    baseUrl: "https://openrouter.ai/api/v1",
    httpReferer: "https://example.com",
    appTitle: "Hades OS",
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    assistantText: "<strong>Draft ready</strong>",
                    draftPatch: {
                      name: "Cat Meme Minion",
                      category: "fun",
                      targetSocial: "discord",
                      triggerType: "manual",
                      action: "send a random cat meme GIF"
                    },
                    missingFields: [],
                    suggestions: ["Test it"]
                  })
                }
              }
            ]
          })
      };
    }
  });

  const result = await client.generateDraft({
    userId: "local-user",
    conversationId: "conv-1",
    message: "Make me a cat meme minion",
    currentDraft: createEmptyDraft(),
    allowedProviders: ["discord"],
    mode: "minion_draft"
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://openrouter.ai/api/v1/chat/completions");

  const headers = calls[0].init.headers;
  assert.equal(headers.Authorization, "Bearer or-test-key");
  assert.equal(headers["HTTP-Referer"], "https://example.com");
  assert.equal(headers["X-OpenRouter-Title"], "Hades OS");

  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.model, "deepseek/deepseek-v4-flash");
  assert.deepEqual(body.response_format, { type: "json_object" });
  assert.equal(body.messages[0].role, "system");
  assert.equal(body.messages[1].role, "user");

  assert.equal(result.assistantText, "<strong>Draft ready</strong>");
  assert.equal(result.draftPatch.name, "Cat Meme Minion");
  assert.equal(result.suggestions[0], "Test it");
});

test("OpenRouter client surfaces HTTP errors with status", async () => {
  const client = createOpenRouterClient({
    apiKey: "or-test-key",
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { message: "Unauthorized" } })
    })
  });

  await assert.rejects(
    () =>
      client.generateDraft({
        userId: "local-user",
        conversationId: "conv-1",
        message: "Make me a minion",
        currentDraft: createEmptyDraft(),
        allowedProviders: [],
        mode: "minion_draft"
      }),
    (error) => {
      assert.equal(error.status, 401);
      assert.match(error.message, /Unauthorized/);
      return true;
    }
  );
});
