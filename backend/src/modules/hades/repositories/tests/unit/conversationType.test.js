import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

let createConversationRepository;

beforeEach(async () => {
  const mod = await import("../../conversationRepository.js");
  createConversationRepository = mod.createConversationRepository;
});

describe("conversationType support", () => {
  test("createConversation stores context_type from argument", async () => {
    const repo = createConversationRepository({ storage: "memory" });
    const conv = await repo.createConversation({
      userId: "user_a",
      tenantId: "tenant_a",
      contextType: "forge",
      data: {},
    });
    assert.equal(conv.context_type, "forge");
  });

  test("createConversation defaults context_type to 'general'", async () => {
    const repo = createConversationRepository({ storage: "memory" });
    const conv = await repo.createConversation({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {},
    });
    assert.equal(conv.context_type, "general");
  });

  test("listConversations filters by context_type when provided", async () => {
    const repo = createConversationRepository({ storage: "memory" });
    await repo.createConversation({ userId: "user_a", tenantId: "tenant_a", contextType: "forge", data: { id: "forge_1" } });
    await repo.createConversation({ userId: "user_a", tenantId: "tenant_a", contextType: "general", data: { id: "gen_1" } });
    await repo.createConversation({ userId: "user_a", tenantId: "tenant_a", contextType: "general", data: { id: "gen_2" } });

    const forge = await repo.listConversations({ userId: "user_a", tenantId: "tenant_a", contextType: "forge" });
    const general = await repo.listConversations({ userId: "user_a", tenantId: "tenant_a", contextType: "general" });

    assert.equal(forge.length, 1);
    assert.equal(forge[0].id, "forge_1");
    assert.equal(general.length, 2);
  });

  test("listConversations returns all when no contextType filter", async () => {
    const repo = createConversationRepository({ storage: "memory" });
    await repo.createConversation({ userId: "user_a", tenantId: "tenant_a", contextType: "forge", data: { id: "forge_1" } });
    await repo.createConversation({ userId: "user_a", tenantId: "tenant_a", contextType: "general", data: { id: "gen_1" } });

    const all = await repo.listConversations({ userId: "user_a", tenantId: "tenant_a" });
    assert.equal(all.length, 2);
  });

  test("general and forge conversations are isolated from each other", async () => {
    const repo = createConversationRepository({ storage: "memory" });
    const forgeConv = await repo.createConversation({ userId: "user_a", tenantId: "tenant_a", contextType: "forge", data: {} });
    const genConv = await repo.createConversation({ userId: "user_a", tenantId: "tenant_a", contextType: "general", data: {} });

    await repo.addMessage({ userId: "user_a", tenantId: "tenant_a", conversationId: forgeConv.id, data: { role: "user", content: "forge only message" } });
    await repo.addMessage({ userId: "user_a", tenantId: "tenant_a", conversationId: genConv.id, data: { role: "user", content: "general only message" } });

    const forgeMsgs = await repo.listMessages({ userId: "user_a", tenantId: "tenant_a", conversationId: forgeConv.id });
    const genMsgs = await repo.listMessages({ userId: "user_a", tenantId: "tenant_a", conversationId: genConv.id });

    assert.equal(forgeMsgs.length, 1);
    assert.equal(genMsgs.length, 1);
    assert.equal(forgeMsgs[0].content, "forge only message");
    assert.equal(genMsgs[0].content, "general only message");
    assert.equal(forgeMsgs[0].content, "forge only message");
    assert.notEqual(forgeMsgs[0].content, "general only message");
  });
});
