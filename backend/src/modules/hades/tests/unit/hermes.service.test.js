import { test } from "node:test";
import assert from "node:assert/strict";
import { createHermesService } from "../../services/hermes.service.js";
import { createEmptyDraft } from "../../data.js";

test("private AI response is used when configured and sanitized", async () => {
  const hermes = createHermesService({
    config: { privateAiBaseUrl: "https://private.ai", privateAiApiKey: "secret" },
    privateAiClient: {
      async generateDraft() {
        return {
          assistantText: "<strong>Done</strong>",
          draftPatch: {
            name: "Task Helper",
            category: "task",
            targetSocial: "private",
            triggerType: "manual",
            action: "turn messy instructions into simple task cards"
          },
          missingFields: [],
          suggestions: ["Test it"]
        };
      }
    }
  });

  const result = await hermes.buildResponse({
    conversationId: "conv-1",
    message: "Make a task helper",
    currentDraft: createEmptyDraft()
  });

  assert.equal(result.source, "private_ai");
  assert.equal(result.assistantMessage.content, "Done");
  assert.equal(result.draft.name, "Task Helper");
});

test("missing private AI config falls back to the local parser", async () => {
  const hermes = createHermesService({ config: {}, privateAiClient: null });
  const result = await hermes.buildResponse({
    message: "I want a command to send cat memes in Discord",
    currentDraft: createEmptyDraft()
  });

  assert.equal(result.source, "local_fallback");
  assert.ok(result.draft.name);
  assert.ok(result.assistantMessage.content.length > 0);
});

test("private AI failure falls back to local parser", async () => {
  const hermes = createHermesService({
    config: { privateAiBaseUrl: "https://private.ai", privateAiApiKey: "secret" },
    privateAiClient: {
      async generateDraft() {
        throw new Error("network down");
      }
    }
  });

  const result = await hermes.buildResponse({
    message: "I want a command to send cat memes in Discord",
    currentDraft: createEmptyDraft()
  });

  assert.equal(result.source, "local_fallback");
});

