import { persistTable, readTableRows } from "./_supabase.js";

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createConversationRepository({ storage = "memory", supabaseClient, tableName = "hades_conversations", messagesTableName = "hades_messages" } = {}) {
  const conversations = new Map();
  const messagesByConversation = new Map();
  let hydrated = false;

  async function hydrate() {
    if (storage !== "supabase" || hydrated) return;
    hydrated = true;
    for (const row of await readTableRows(supabaseClient, tableName)) {
      if (!row?.id) continue;
      conversations.set(row.id, { ...row });
      if (!messagesByConversation.has(row.id)) {
        messagesByConversation.set(row.id, []);
      }
    }
    for (const row of await readTableRows(supabaseClient, messagesTableName)) {
      if (!row?.conversation_id) continue;
      const msgs = messagesByConversation.get(row.conversation_id);
      if (msgs) {
        msgs.push({ ...row });
      } else {
        messagesByConversation.set(row.conversation_id, [{ ...row }]);
      }
    }
  }

  async function persistConv(row, mode = "upsert") {
    if (storage === "supabase") {
      await persistTable(supabaseClient, tableName, mode, row);
    }
  }

  async function persistMsg(row) {
    if (storage === "supabase") {
      await persistTable(supabaseClient, messagesTableName, "insert", row);
    }
  }

  async function createConversation({ userId, tenantId, data, contextType } = {}) {
    await hydrate();
    const record = {
      ...data,
      id: data.id || createId("conv"),
      user_id: userId,
      tenant_id: tenantId,
      context_type: contextType || data.context_type || "general",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    conversations.set(record.id, record);
    if (!messagesByConversation.has(record.id)) {
      messagesByConversation.set(record.id, []);
    }
    await persistConv(record);
    return record;
  }

  async function listConversations({ userId, tenantId, contextType }) {
    await hydrate();
    return [...conversations.values()].filter(
      (c) => c.user_id === userId && c.tenant_id === tenantId && (contextType == null || c.context_type === contextType)
    );
  }

  async function addMessage({ userId, tenantId, conversationId, data, idempotencyKey }) {
    await hydrate();
    const conv = conversations.get(conversationId);
    if (!conv) return null;
    if (conv.user_id !== userId || conv.tenant_id !== tenantId) return null;
    if (idempotencyKey) {
      const msgs = messagesByConversation.get(conversationId) || [];
      const existing = msgs.find((m) => m.idempotency_key === idempotencyKey);
      if (existing) return existing;
    }
    const record = {
      ...data,
      id: data.id || createId("msg"),
      conversation_id: conversationId,
      user_id: userId,
      tenant_id: tenantId,
      idempotency_key: idempotencyKey || null,
      created_at: new Date().toISOString(),
    };
    const msgs = messagesByConversation.get(conversationId) || [];
    msgs.push(record);
    messagesByConversation.set(conversationId, msgs);
    await persistMsg(record);
    return record;
  }

  async function listMessages({ userId, tenantId, conversationId }) {
    await hydrate();
    const conv = conversations.get(conversationId);
    if (!conv) return [];
    if (conv.user_id !== userId || conv.tenant_id !== tenantId) return [];
    return [...(messagesByConversation.get(conversationId) || [])];
  }

  async function clearMessages({ userId, tenantId, conversationId }) {
    await hydrate();
    const conv = conversations.get(conversationId);
    if (!conv) return null;
    if (conv.user_id !== userId || conv.tenant_id !== tenantId) return null;
    messagesByConversation.set(conversationId, []);
    return { cleared: true };
  }

  return { createConversation, listConversations, addMessage, listMessages, clearMessages };
}
