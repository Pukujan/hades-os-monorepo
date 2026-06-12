import { test } from "node:test";
import assert from "node:assert/strict";
import { createHadesRepository } from "../../repositories/hades.repository.js";
import { createHermesService } from "../../services/hermes.service.js";
import { createHadesService } from "../../services/hades.service.js";
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

test("Hades service chat uses backend-authenticated user context when provided", async () => {
  const repository = createHadesRepository({ now: () => "2026-06-12T00:00:00.000Z" });
  const hermes = createHermesService({
    hermesRuntime: {
      async generateDraft(input) {
        assert.equal(input.userId, "user_123");
        return {
          source: "hermes_runtime",
          sessionId: "session-auth-1",
          assistantText: "Updated",
          draftPatch: {
            name: "Task Helper",
            category: "task",
            targetSocial: "private",
            triggerType: "manual",
            action: "turn messy instructions into simple task cards"
          },
          missingFields: [],
          suggestions: []
        };
      }
    }
  });
  const service = createHadesService({ repository, hermes });

  const result = await service.chat(
    {
      clientMessageId: "msg-auth-1",
      idempotencyKey: "idem-auth-1",
      message: "Make a task helper",
      currentDraft: createEmptyDraft()
    },
    {
      userId: "user_123",
      tenantId: "tenant_123",
      discordAccountId: "discord_456",
      provider: "discord"
    }
  );

  assert.equal(result.sessionId, "session-auth-1");
  assert.equal(result.userMessage.userId, "user_123");
  assert.equal(result.assistantMessage.role, "assistant");
  const snapshot = repository.getSnapshot();
  assert.equal(snapshot.conversations[0].userId, "user_123");
  assert.equal(snapshot.agentExecutions[0].userId, "user_123");
});
