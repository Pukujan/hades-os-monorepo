import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHadesService } from "../../services/hades.service.js";
import { createConversationRepository } from "../../repositories/conversationRepository.js";
import { createAgentExecutionRepository } from "../../repositories/agentExecutionRepository.js";

/**
 * Tests that conversation state survives failed Hermes calls.
 *
 * The chat() function saves the user message BEFORE calling hermes.buildResponse().
 * If Hermes throws, the user message should still be persisted.
 * Idempotency keys should prevent duplicate messages on retry.
 */

function createFailingHermes(msg) {
  return {
    buildResponse: async () => {
      throw new Error(msg || "Command failed: /opt/hermes-venv/bin/hermes --oneshot openrouter --model deepseek/deepseek-v4-flash");
    },
  };
}

const AUTH = { userId: "durable-u1", tenantId: "durable-t1" };

describe("Durable memory after Hermes failure", () => {
  test("user message is persisted even when Hermes throws", async () => {
    const conversations = createConversationRepository({ storage: "memory" });
    const executions = createAgentExecutionRepository({ storage: "memory" });
    const service = createHadesService({
      repository: { saveAgentExecution: async () => null },
      scopedRepos: { conversations, executions },
      hermes: createFailingHermes(),
    });

    try {
      await service.chat({
        message: "This is a long request that should test durable memory",
        idempotencyKey: "test-fail-001",
        clientMessageId: "msg-fail-001",
      }, AUTH);
      assert.fail("chat() should have thrown");
    } catch (err) {
      assert.ok(err.message.includes("Command failed"), "Expected Hermes error");
    }

    // Find the conversation that was created
    const convs = await conversations.listConversations({ userId: "durable-u1", tenantId: "durable-t1" });
    assert.equal(convs.length, 1, "One conversation should exist");

    // User message should still be in the conversation
    const messages = await conversations.listMessages({
      userId: "durable-u1",
      tenantId: "durable-t1",
      conversationId: convs[0].id,
    });
    const userMessages = messages.filter((m) => m.role === "user");
    assert.equal(userMessages.length, 1, "User message should be persisted");
    assert.equal(
      userMessages[0].content,
      "This is a long request that should test durable memory",
      "User message content should match"
    );

    // No assistant message should exist (Hermes never completed)
    const assistantMessages = messages.filter((m) => m.role === "assistant");
    assert.equal(assistantMessages.length, 0, "No assistant message should exist after failure");
  });

  test("idempotency key prevents duplicate user messages on retry after failure", async () => {
    const conversations = createConversationRepository({ storage: "memory" });
    const executions = createAgentExecutionRepository({ storage: "memory" });
    let hermesCallCount = 0;

    const service = createHadesService({
      repository: { saveAgentExecution: async () => null },
      scopedRepos: { conversations, executions },
      hermes: {
        buildResponse: async () => {
          hermesCallCount++;
          if (hermesCallCount === 1) {
            throw new Error("Command failed: /opt/hermes-venv/bin/hermes timeout");
          }
          return {
            assistantText: "Retry succeeded",
            reply: "Retry succeeded",
            source: "hermes_runtime",
            actions: [],
            cards: [],
            suggestions: [],
            draft: { category: null, targetSocial: null, triggerType: null, status: "idle", content: "" },
            missingFields: [],
            sessionId: null,
            assistantMessage: {
              role: "assistant",
              content: "Retry succeeded",
              status: "completed",
              suggestions: [],
              actions: [],
            },
          };
        },
      },
    });

    // First call: Hermes fails
    try {
      await service.chat({
        message: "Test retry after failure",
        idempotencyKey: "test-retry-001",
        clientMessageId: "msg-retry-001",
      }, AUTH);
      assert.fail("First chat() should have thrown");
    } catch (err) {
      assert.ok(err, "Expected error on first call");
    }

    // Find conversation
    const convs = await conversations.listConversations({ userId: "durable-u1", tenantId: "durable-t1" });
    assert.equal(convs.length, 1, "One conversation after first call");

    // Verify one user message persisted
    let messages = await conversations.listMessages({
      userId: "durable-u1", tenantId: "durable-t1", conversationId: convs[0].id,
    });
    assert.equal(messages.filter((m) => m.role === "user").length, 1, "One user message after first failure");

    // Second call: same idempotency key, Hermes succeeds this time
    const result = await service.chat({
      message: "Test retry after failure",
      idempotencyKey: "test-retry-001",
      clientMessageId: "msg-retry-001",
      conversationId: convs[0].id,
    }, AUTH);

    // Should still only have ONE user message (idempotency)
    messages = await conversations.listMessages({
      userId: "durable-u1", tenantId: "durable-t1", conversationId: convs[0].id,
    });
    const userMsgs = messages.filter((m) => m.role === "user");
    assert.equal(userMsgs.length, 1, "Still only one user message after retry (idempotency)");
    assert.equal(userMsgs[0].content, "Test retry after failure");

    // Should now have one assistant message (from successful retry)
    const assistantMsgs = messages.filter((m) => m.role === "assistant");
    assert.equal(assistantMsgs.length, 1, "One assistant message after successful retry");
    assert.equal(assistantMsgs[0].content, "Retry succeeded");

    assert.equal(result.assistantMessage.content, "Retry succeeded", "Returned retry result");
  });

  test("multiple sequential failures don't corrupt conversation state", async () => {
    const conversations = createConversationRepository({ storage: "memory" });
    const executions = createAgentExecutionRepository({ storage: "memory" });
    let callNumber = 0;

    const service = createHadesService({
      repository: { saveAgentExecution: async () => null },
      scopedRepos: { conversations, executions },
      hermes: {
        buildResponse: async () => {
          callNumber++;
          if (callNumber <= 3) {
            throw new Error("Hermes unavailable (attempt " + callNumber + ")");
          }
          return {
            assistantText: "Final success",
            reply: "Final success",
            source: "hermes_runtime",
            actions: [],
            cards: [],
            suggestions: [],
            draft: { category: null, targetSocial: null, triggerType: null, status: "idle", content: "" },
            missingFields: [],
            sessionId: null,
            assistantMessage: {
              role: "assistant",
              content: "Final success",
              status: "completed",
              suggestions: [],
              actions: [],
            },
          };
        },
      },
    });

    // Send 3 failing requests with different idempotency keys
    for (let i = 1; i <= 3; i++) {
      try {
        await service.chat({
          message: `Attempt ${i}`,
          idempotencyKey: `test-multi-${i}`,
          clientMessageId: `msg-multi-${i}`,
        }, AUTH);
      } catch (err) {
        // Expected
      }
    }

    // Should have 3 user messages (different keys) and 0 assistant messages
    const convs = await conversations.listConversations({ userId: "durable-u1", tenantId: "durable-t1" });
    assert.equal(convs.length, 1, "One conversation for all 3 attempts");
    let messages = await conversations.listMessages({
      userId: "durable-u1", tenantId: "durable-t1", conversationId: convs[0].id,
    });
    assert.equal(messages.filter((m) => m.role === "user").length, 3, "Three user messages persisted");
    assert.equal(messages.filter((m) => m.role === "assistant").length, 0, "No assistant messages");

    // Now retry the LAST one with the same idempotency key
    const result = await service.chat({
      message: "Attempt 3",
      idempotencyKey: "test-multi-3",
      clientMessageId: "msg-multi-3",
      conversationId: convs[0].id,
    }, AUTH);

    messages = await conversations.listMessages({
      userId: "durable-u1", tenantId: "durable-t1", conversationId: convs[0].id,
    });
    assert.equal(messages.filter((m) => m.role === "user").length, 3, "Still 3 user messages (no duplication)");
    assert.equal(messages.filter((m) => m.role === "assistant").length, 1, "One assistant message added");
    assert.equal(result.assistantMessage.content, "Final success", "Correct result from retry");
  });

  test("conversation message order is preserved after failed Hermes call", async () => {
    const conversations = createConversationRepository({ storage: "memory" });
    const executions = createAgentExecutionRepository({ storage: "memory" });
    let succeeded = false;

    const service = createHadesService({
      repository: { saveAgentExecution: async () => null },
      scopedRepos: { conversations, executions },
      hermes: {
        buildResponse: async () => {
          if (!succeeded) throw new Error("Hermes not ready");
          return {
            assistantText: "Ready now",
            reply: "Ready now",
            source: "hermes_runtime",
            actions: [],
            cards: [],
            suggestions: [],
            draft: { category: null, targetSocial: null, triggerType: null, status: "idle", content: "" },
            missingFields: [],
            sessionId: null,
            assistantMessage: {
              role: "assistant",
              content: "Ready now",
              status: "completed",
              suggestions: [],
              actions: [],
            },
          };
        },
      },
    });

    // First message: Hermes fails
    try {
      await service.chat({
        message: "First message",
        idempotencyKey: "order-1",
        clientMessageId: "msg-order-1",
      }, AUTH);
    } catch (err) { /* expected */ }

    // Second message: Hermes succeeds
    succeeded = true;
    const convs = await conversations.listConversations({ userId: "durable-u1", tenantId: "durable-t1" });
    const convId = convs[0].id;
    const result = await service.chat({
      message: "Second message",
      idempotencyKey: "order-2",
      clientMessageId: "msg-order-2",
      conversationId: convId,
    }, AUTH);

    const messages = await conversations.listMessages({
      userId: "durable-u1", tenantId: "durable-t1", conversationId: convId,
    });

    // Order should be: user1 (from failed call), user2, assistant2
    assert.equal(messages.length, 3, "Three messages total");
    assert.equal(messages[0].role, "user", "First message is user");
    assert.equal(messages[0].content, "First message", "First message content preserved");
    assert.equal(messages[1].role, "user", "Second message is user");
    assert.equal(messages[1].content, "Second message", "Second message content correct");
    assert.equal(messages[2].role, "assistant", "Third message is assistant");
    assert.equal(messages[2].content, "Ready now", "Assistant responds to second message");
    assert.equal(result.assistantMessage.content, "Ready now");
  });
});
