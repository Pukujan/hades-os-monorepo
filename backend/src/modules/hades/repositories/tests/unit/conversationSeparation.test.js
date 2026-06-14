import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

let createConversationRepository;

beforeEach(async () => {
  const mod = await import("../../conversationRepository.js");
  createConversationRepository = mod.createConversationRepository;
});

describe("conversation log separation", () => {
  test("general chat creates separate conversation from forge chat", async () => {
    const repo = createConversationRepository({ storage: "memory" });

    const genConv = await repo.createConversation({
      userId: "user_a", tenantId: "tenant_a",
      contextType: "general", data: {},
    });
    await repo.addMessage({
      userId: "user_a", tenantId: "tenant_a",
      conversationId: genConv.id,
      data: { role: "user", content: "where do I connect telegram?" },
    });

    const forgeConv = await repo.createConversation({
      userId: "user_a", tenantId: "tenant_a",
      contextType: "forge", data: {},
    });
    await repo.addMessage({
      userId: "user_a", tenantId: "tenant_a",
      conversationId: forgeConv.id,
      data: { role: "user", content: "make a telegram minion" },
    });

    const generalList = await repo.listConversations({
      userId: "user_a", tenantId: "tenant_a", contextType: "general",
    });
    const forgeList = await repo.listConversations({
      userId: "user_a", tenantId: "tenant_a", contextType: "forge",
    });

    assert.equal(generalList.length, 1, "should find exactly 1 general conversation");
    assert.equal(forgeList.length, 1, "should find exactly 1 forge conversation");

    const genMsgs = await repo.listMessages({
      userId: "user_a", tenantId: "tenant_a", conversationId: genConv.id,
    });
    const forgeMsgs = await repo.listMessages({
      userId: "user_a", tenantId: "tenant_a", conversationId: forgeConv.id,
    });

    assert.equal(genMsgs.length, 1);
    assert.equal(genMsgs[0].content, "where do I connect telegram?");
    assert.equal(forgeMsgs.length, 1);
    assert.equal(forgeMsgs[0].content, "make a telegram minion");
  });

  test("listConversations with contextType filter only returns matching conversations", async () => {
    const repo = createConversationRepository({ storage: "memory" });

    await repo.createConversation({
      userId: "user_a", tenantId: "tenant_a", contextType: "general", data: { id: "gen_1" },
    });
    await repo.createConversation({
      userId: "user_a", tenantId: "tenant_a", contextType: "forge", data: { id: "forge_1" },
    });
    await repo.createConversation({
      userId: "user_a", tenantId: "tenant_a", contextType: "forge", data: { id: "forge_2" },
    });

    const general = await repo.listConversations({ userId: "user_a", tenantId: "tenant_a", contextType: "general" });
    const forge = await repo.listConversations({ userId: "user_a", tenantId: "tenant_a", contextType: "forge" });

    assert.equal(general.length, 1);
    assert.equal(general[0].id, "gen_1");
    assert.equal(forge.length, 2);
  });

  test("existing conversations with no context_type default to general filter", async () => {
    const repo = createConversationRepository({ storage: "memory" });

    // Simulate old-format conversation without context_type
    const oldConv = await repo.createConversation({
      userId: "user_a", tenantId: "tenant_a", contextType: undefined, data: { id: "old_conv" },
    });

    // When listing with general filter, old conversations (no context_type) should match
    const general = await repo.listConversations({ userId: "user_a", tenantId: "tenant_a", contextType: "general" });

    assert.equal(general.length, 1);
    assert.equal(general[0].id, "old_conv");

    // When listing with forge filter, old conversations should NOT match
    const forge = await repo.listConversations({ userId: "user_a", tenantId: "tenant_a", contextType: "forge" });
    assert.equal(forge.length, 0);
  });
});
