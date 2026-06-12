import { test } from "node:test";
import assert from "node:assert/strict";
import { createHermesService } from "../../services/hermes.service.js";
import { createEmptyDraft } from "../../data.js";

test("Hermes runtime response is used and sanitized", async () => {
  let runtimeCalls = 0;
  const hermes = createHermesService({
    hermesRuntime: {
      async generateDraft() {
        runtimeCalls += 1;
        return {
          source: "hermes_runtime",
          sessionId: "20260611_runtime",
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

  assert.equal(runtimeCalls, 1);
  assert.equal(result.source, "hermes_runtime");
  assert.equal(result.sessionId, "20260611_runtime");
  assert.equal(result.assistantMessage.content, "Done");
  assert.equal(result.draft.name, "Task Helper");
});

test("Hermes runtime invalid enum output fails fast", async () => {
  const hermes = createHermesService({
    hermesRuntime: {
      async generateDraft() {
        return {
          source: "hermes_runtime",
          assistantText: "Invalid draft",
          draftPatch: {
            name: "Unsafe Minion",
            category: "unknown",
            targetSocial: "discord",
            triggerType: "command"
          },
          missingFields: [],
          suggestions: []
        };
      }
    }
  });

  await assert.rejects(
    () =>
      hermes.buildResponse({
        conversationId: "conv-1",
        message: "I want a command to send cat memes in Discord",
        currentDraft: createEmptyDraft()
      }),
    /Invalid draft patch from Hermes runtime/i
  );
});

test("Hermes runtime failure bubbles instead of falling back", async () => {
  const hermes = createHermesService({
    hermesRuntime: {
      async generateDraft() {
        throw new Error("runtime down");
      }
    }
  });

  await assert.rejects(
    () =>
      hermes.buildResponse({
        message: "I want a command to send cat memes in Discord",
        currentDraft: createEmptyDraft()
      }),
    /runtime down/i
  );
});
