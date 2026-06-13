import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

async function loadRepo() {
  try {
    return await import("../../conversationRepository.js");
  } catch (error) {
    throw new Error("Missing conversationRepository.js", { cause: error });
  }
}

describe("conversationRepository tenant scoping", () => {
  let repo;

  beforeEach(async () => {
    const mod = await loadRepo();
    repo = mod.createConversationRepository({ storage: "memory" });

    await repo.createConversation({
      userId: "user_a",
      tenantId: "tenant_a",
      data: { id: "conv_a", title: "A Conversation" },
    });

    await repo.createConversation({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "conv_b", title: "B Conversation" },
    });

    await repo.addMessage({
      userId: "user_a",
      tenantId: "tenant_a",
      conversationId: "conv_a",
      data: { id: "msg_a", role: "user", content: "A secret" },
    });

    await repo.addMessage({
      userId: "user_b",
      tenantId: "tenant_b",
      conversationId: "conv_b",
      data: { id: "msg_b", role: "user", content: "B secret" },
    });
  });

  test("list conversations returns only current user's conversations", async () => {
    const conversations = await repo.listConversations({
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assert.equal(conversations.length, 1);
    assert.equal(conversations[0].id, "conv_a");
  });

  test("messages from User B are invisible to User A", async () => {
    const messages = await repo.listMessages({
      userId: "user_a",
      tenantId: "tenant_a",
      conversationId: "conv_b",
    });

    assert.deepEqual(messages, []);
  });

  test("clear messages only clears current user's conversation", async () => {
    await repo.clearMessages({
      userId: "user_a",
      tenantId: "tenant_a",
      conversationId: "conv_a",
    });

    const userAMessages = await repo.listMessages({
      userId: "user_a",
      tenantId: "tenant_a",
      conversationId: "conv_a",
    });

    const userBMessages = await repo.listMessages({
      userId: "user_b",
      tenantId: "tenant_b",
      conversationId: "conv_b",
    });

    assert.deepEqual(userAMessages, []);
    assert.equal(userBMessages.length, 1);
  });
});
