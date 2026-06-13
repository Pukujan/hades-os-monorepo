function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createConversationRepository({ storage = "memory" } = {}) {
  const conversations = new Map();
  const messagesByConversation = new Map();

  async function createConversation({ userId, tenantId, data }) {
    const record = {
      ...data,
      id: data.id || createId("conv"),
      user_id: userId,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    conversations.set(record.id, record);
    if (!messagesByConversation.has(record.id)) {
      messagesByConversation.set(record.id, []);
    }
    return record;
  }

  async function listConversations({ userId, tenantId }) {
    return [...conversations.values()].filter(
      (c) => c.user_id === userId && c.tenant_id === tenantId
    );
  }

  async function addMessage({ userId, tenantId, conversationId, data }) {
    const conv = conversations.get(conversationId);
    if (!conv) return null;
    if (conv.user_id !== userId || conv.tenant_id !== tenantId) return null;
    const record = {
      ...data,
      id: data.id || createId("msg"),
      conversation_id: conversationId,
      user_id: userId,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
    };
    const msgs = messagesByConversation.get(conversationId) || [];
    msgs.push(record);
    messagesByConversation.set(conversationId, msgs);
    return record;
  }

  async function listMessages({ userId, tenantId, conversationId }) {
    const conv = conversations.get(conversationId);
    if (!conv) return [];
    if (conv.user_id !== userId || conv.tenant_id !== tenantId) return [];
    return [...(messagesByConversation.get(conversationId) || [])];
  }

  async function clearMessages({ userId, tenantId, conversationId }) {
    const conv = conversations.get(conversationId);
    if (!conv) return null;
    if (conv.user_id !== userId || conv.tenant_id !== tenantId) return null;
    messagesByConversation.set(conversationId, []);
    return { cleared: true };
  }

  return { createConversation, listConversations, addMessage, listMessages, clearMessages };
}
