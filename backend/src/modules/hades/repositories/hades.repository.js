import { randomUUID } from "crypto";

function nowIso(now = () => new Date().toISOString()) {
  return now();
}

function createId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function createIdempotencyKey(scope, key) {
  return `${scope}:${key}`;
}

export function createHadesRepository({ now = () => new Date().toISOString(), storage = "memory", supabaseClient = null } = {}) {
  const conversations = new Map();
  const messages = new Map();
  const minions = new Map();
  const assignments = new Map();
  const testRuns = new Map();
  const idempotency = new Map();
  const sequenceByConversation = new Map();

  function remember(scope, key, value) {
    idempotency.set(createIdempotencyKey(scope, key), value);
    return value;
  }

  function recall(scope, key) {
    return idempotency.get(createIdempotencyKey(scope, key)) || null;
  }

  async function persistTable(client, name, mode, row) {
    if (!client?.table) return;
    const table = client.table(name);
    if (mode === "upsert" && typeof table.upsert === "function") {
      await table.upsert(row);
      return;
    }
    if (typeof table.insert === "function") {
      await table.insert(row);
    }
  }

  async function persistConversation(client, conversation) {
    await persistTable(client, "conversations", "upsert", {
      id: conversation.id,
      userId: conversation.userId,
      draftSnapshot: conversation.draftSnapshot,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    });
  }

  async function persistMessage(client, message) {
    await persistTable(client, "chat_messages", "insert", message);
  }

  async function persistMinion(client, minion) {
    await persistTable(client, "minions", "upsert", minion);
  }

  async function persistAssignment(client, assignment) {
    await persistTable(client, "minion_assignments", "upsert", assignment);
  }

  async function persistTestRun(client, testRun) {
    await persistTable(client, "minion_test_runs", "upsert", testRun);
  }

  function getOrCreateConversation({ conversationId, userId = "local-user" } = {}) {
    const id = conversationId || createId("conv");
    const existing = conversations.get(id);
    if (existing) return existing;

    const record = {
      id,
      userId,
      draftSnapshot: null,
      createdAt: nowIso(now),
      updatedAt: nowIso(now)
    };
    conversations.set(id, record);
    messages.set(id, []);
    sequenceByConversation.set(id, 0);
    if (storage === "supabase") {
      void persistConversation(supabaseClient, record);
    }
    return record;
  }

  async function appendMessage({ conversationId, idempotencyKey, message }) {
    const cached = recall("message", idempotencyKey);
    if (cached) return cached;

    const conversation = getOrCreateConversation({ conversationId, userId: message.userId || "local-user" });
    const nextSequence = (sequenceByConversation.get(conversation.id) || 0) + 1;
    sequenceByConversation.set(conversation.id, nextSequence);
    const record = {
      ...message,
      id: message.id || createId("msg"),
      conversationId: conversation.id,
      sequenceNumber: message.sequenceNumber ?? nextSequence,
      createdAt: message.createdAt || nowIso(now),
      updatedAt: message.updatedAt || nowIso(now),
      clientMessageId: message.clientMessageId || null,
      idempotencyKey
    };

    messages.get(conversation.id).push(record);
    conversation.updatedAt = nowIso(now);
    const client = storage === "supabase" ? supabaseClient : null;
    await persistConversation(client, conversation);
    await persistMessage(client, record);
    return remember("message", idempotencyKey, record);
  }

  async function saveConversationDraft({ conversationId, draftSnapshot }) {
    const conversation = getOrCreateConversation({ conversationId });
    conversation.draftSnapshot = draftSnapshot ? JSON.parse(JSON.stringify(draftSnapshot)) : null;
    conversation.updatedAt = nowIso(now);
    const client = storage === "supabase" ? supabaseClient : null;
    await persistConversation(client, conversation);
    return conversation;
  }

  async function saveTestRun({ idempotencyKey, run }) {
    const cached = recall("testRun", idempotencyKey);
    if (cached) return cached;

    const record = {
      ...run,
      id: run.id || createId("testrun"),
      createdAt: run.createdAt || nowIso(now),
      updatedAt: run.updatedAt || nowIso(now),
      idempotencyKey
    };
    testRuns.set(record.id, record);
    const client = storage === "supabase" ? supabaseClient : null;
    await persistTestRun(client, record);
    return remember("testRun", idempotencyKey, record);
  }

  async function saveMinion({ idempotencyKey, minion }) {
    const cached = recall("minion", idempotencyKey);
    if (cached) return cached;

    const record = {
      ...minion,
      id: minion.id || createId("minion"),
      createdAt: minion.createdAt || nowIso(now),
      updatedAt: minion.updatedAt || nowIso(now),
      idempotencyKey
    };
    minions.set(record.id, record);
    const client = storage === "supabase" ? supabaseClient : null;
    await persistMinion(client, record);
    return remember("minion", idempotencyKey, record);
  }

  async function saveAssignment({ idempotencyKey, assignment }) {
    const cached = recall("assignment", idempotencyKey);
    if (cached) return cached;

    const record = {
      ...assignment,
      id: assignment.id || createId("assignment"),
      createdAt: assignment.createdAt || nowIso(now),
      updatedAt: assignment.updatedAt || nowIso(now),
      idempotencyKey
    };
    assignments.set(record.id, record);
    const client = storage === "supabase" ? supabaseClient : null;
    await persistAssignment(client, record);
    return remember("assignment", idempotencyKey, record);
  }

  function listMessages(conversationId) {
    return [...(messages.get(conversationId) || [])];
  }

  function getMinion(id) {
    return minions.get(id) || null;
  }

  function listMinions() {
    return [...minions.values()];
  }

  function listAssignments() {
    return [...assignments.values()];
  }

  function listTestRuns() {
    return [...testRuns.values()];
  }

  function getSnapshot() {
    return {
      conversations: [...conversations.values()],
      messages: [...messages.entries()].flatMap(([conversationId, entries]) => entries.map((entry) => ({ ...entry, conversationId }))),
      minions: [...minions.values()],
      assignments: [...assignments.values()],
      testRuns: [...testRuns.values()]
    };
  }

  return {
    getOrCreateConversation,
    appendMessage,
    saveConversationDraft,
    saveTestRun,
    saveMinion,
    saveAssignment,
    listMessages,
    listMinions,
    listAssignments,
    listTestRuns,
    getMinion,
    getSnapshot
  };
}
