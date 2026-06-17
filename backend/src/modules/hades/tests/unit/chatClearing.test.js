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

async function loadConversationRepository() {
  try {
    return await import("../../repositories/conversationRepository.js");
  } catch (error) {
    throw new Error(
      "Missing conversationRepository.js â€” expected at ../../repositories/conversationRepository.js",
      { cause: error }
    );
  }
}

async function loadExecutionRepository() {
  try {
    return await import("../../repositories/agentExecutionRepository.js");
  } catch (error) {
    throw new Error(
      "Missing agentExecutionRepository.js â€” expected at ../../repositories/agentExecutionRepository.js",
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

  test("clearMessages removes chat messages but preserves long-term execution context", async () => {
    const { createHadesService } = await loadHadesService();
    const { createConversationRepository } = await loadConversationRepository();
    const { createAgentExecutionRepository } = await loadExecutionRepository();

    const conversations = createConversationRepository({ storage: "memory" });
    const executions = createAgentExecutionRepository({ storage: "memory" });
    const service = createHadesService({
      scopedRepos: {
        conversations,
        executions,
      },
      hermes: {
        async buildResponse() {
          return {
            assistantMessage: { role: "assistant", content: "remembered", status: "completed", suggestions: [], actions: [] },
            draft: {},
            missingFields: [],
            suggestions: [],
            source: "hermes_runtime",
            sessionId: "sess-1",
          };
        },
      },
    });

    const authContext = { userId: "user_a", tenantId: "tenant_a" };

    const chat = await service.chat({
      message: "remember this",
      clientMessageId: "ctx-1",
      idempotencyKey: "ctx-1",
      context: "general",
    }, authContext);

    const beforeMessages = await conversations.listMessages({
      userId: "user_a",
      tenantId: "tenant_a",
      conversationId: chat.conversationId,
    });
    assert.ok(beforeMessages.length > 0, "Messages should exist before clearing");

    const beforeExecutions = await executions.listByUser({ userId: "user_a", tenantId: "tenant_a" });
    assert.equal(beforeExecutions.length, 1, "Hermes execution should be saved as long-term context");
    assert.equal(beforeExecutions[0].session_id, "sess-1");

    const clearResult = await service.clearMessages(chat.conversationId, authContext);
    assert.ok(clearResult, "clearMessages should return a result");

    const afterMessages = await conversations.listMessages({
      userId: "user_a",
      tenantId: "tenant_a",
      conversationId: chat.conversationId,
    });
    assert.equal(afterMessages.length, 0, "Chat messages should be removed");

    const afterExecutions = await executions.listByUser({ userId: "user_a", tenantId: "tenant_a" });
    assert.equal(afterExecutions.length, 1, "Long-term execution context should still exist after clearing chat");
    assert.equal(afterExecutions[0].session_id, "sess-1");
  });
});
