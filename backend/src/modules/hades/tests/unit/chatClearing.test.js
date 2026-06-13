import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadHadesService() {
  try {
    return await import("../../services/hades.service.js");
  } catch (error) {
    throw new Error(
      "Missing hades.service.js — expected at ../../services/hades.service.js",
      { cause: error }
    );
  }
}

async function loadHadesRepository() {
  try {
    return await import("../../repositories/hades.repository.js");
  } catch (error) {
    throw new Error(
      "Missing hades.repository.js — expected at ../../repositories/hades.repository.js",
      { cause: error }
    );
  }
}

describe("Chat clearing", () => {
  test("clearMessages removes all messages from a conversation", async () => {
    const { createHadesService } = await loadHadesService();
    const { createHadesRepository } = await loadHadesRepository();

    const repository = createHadesRepository({ now: () => "2026-06-13T00:00:00.000Z" });
    const service = createHadesService({
      repository,
      hermes: {
        async buildResponse() {
          return {
            assistantMessage: { role: "assistant", content: "hi", status: "completed", suggestions: [] },
            draft: {},
            missingFields: [],
            suggestions: [],
            source: "test",
            sessionId: null,
          };
        },
      },
    });

    const chat1 = await service.chat({
      message: "hello",
      clientMessageId: "clear-test-msg",
      idempotencyKey: "clear-test-1",
    });
    assert.ok(chat1.conversationId, "Chat should return a conversationId");

    const before = repository.listMessages(chat1.conversationId);
    assert.ok(before.length > 0, "Messages should exist before clearing");

    const clearResult = await service.clearMessages(chat1.conversationId);
    assert.ok(clearResult, "clearMessages should return a result");

    const after = repository.listMessages(chat1.conversationId);
    assert.equal(after.length, 0, "Messages should be empty after clearing");
  });

  test("clearMessages returns 404 for non-existent conversation", async () => {
    const { createHadesService } = await loadHadesService();
    const { createHadesRepository } = await loadHadesRepository();
    const repository = createHadesRepository();
    const service = createHadesService({ repository, hermes: null });

    await assert.rejects(
      () => service.clearMessages("nonexistent-conversation"),
      /not found/i
    );
  });

  test("deleteConversationMessages exists on repository", async () => {
    const { createHadesRepository } = await loadHadesRepository();
    const repository = createHadesRepository();

    assert.equal(typeof repository.deleteConversationMessages, "function",
      "Repository should have deleteConversationMessages method");
  });

  test("clearMessages is idempotent for already-cleared conversations", async () => {
    const { createHadesService } = await loadHadesService();
    const { createHadesRepository } = await loadHadesRepository();

    const repository = createHadesRepository({ now: () => "2026-06-13T00:00:00.000Z" });
    const service = createHadesService({
      repository,
      hermes: {
        async buildResponse() {
          return {
            assistantMessage: { role: "assistant", content: "hi", status: "completed", suggestions: [] },
            draft: {},
            missingFields: [],
            suggestions: [],
            source: "test",
            sessionId: null,
          };
        },
      },
    });

    const chat = await service.chat({
      message: "test",
      clientMessageId: "clear-idempotent-msg",
      idempotencyKey: "clear-idempotent-1",
    });

    await service.clearMessages(chat.conversationId);
    const afterFirst = repository.listMessages(chat.conversationId);
    assert.equal(afterFirst.length, 0);

    const secondResult = await service.clearMessages(chat.conversationId);
    assert.ok(secondResult, "Second clear should also succeed");
    const afterSecond = repository.listMessages(chat.conversationId);
    assert.equal(afterSecond.length, 0, "Should still be empty after second clear");
  });
});
