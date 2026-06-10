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

export function createHadesRepository({ now = () => new Date().toISOString() } = {}) {
  const conversations = new Map();
  const messages = new Map();
  const minions = new Map();
  const assignments = new Map();
  const testRuns = new Map();
  const idempotency = new Map();

  function remember(scope, key, value) {
    idempotency.set(createIdempotencyKey(scope, key), value);
    return value;
  }

  function recall(scope, key) {
    return idempotency.get(createIdempotencyKey(scope, key)) || null;
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
    return record;
  }

  function appendMessage({ conversationId, idempotencyKey, message }) {
    const cached = recall("message", idempotencyKey);
    if (cached) return cached;

    const conversation = getOrCreateConversation({ conversationId, userId: message.userId || "local-user" });
    const record = {
      ...message,
      id: message.id || createId("msg"),
      conversationId: conversation.id,
      createdAt: message.createdAt || nowIso(now)
    };

    messages.get(conversation.id).push(record);
    conversation.updatedAt = nowIso(now);

    return remember("message", idempotencyKey, record);
  }

  function saveConversationDraft({ conversationId, draftSnapshot }) {
    const conversation = getOrCreateConversation({ conversationId });
    conversation.draftSnapshot = draftSnapshot ? JSON.parse(JSON.stringify(draftSnapshot)) : null;
    conversation.updatedAt = nowIso(now);
    return conversation;
  }

  function saveTestRun({ idempotencyKey, run }) {
    const cached = recall("testRun", idempotencyKey);
    if (cached) return cached;

    const record = {
      ...run,
      id: run.id || createId("testrun"),
      createdAt: run.createdAt || nowIso(now)
    };
    testRuns.set(record.id, record);
    return remember("testRun", idempotencyKey, record);
  }

  function saveMinion({ idempotencyKey, minion }) {
    const cached = recall("minion", idempotencyKey);
    if (cached) return cached;

    const record = {
      ...minion,
      id: minion.id || createId("minion"),
      createdAt: minion.createdAt || nowIso(now),
      updatedAt: minion.updatedAt || nowIso(now)
    };
    minions.set(record.id, record);
    return remember("minion", idempotencyKey, record);
  }

  function saveAssignment({ idempotencyKey, assignment }) {
    const cached = recall("assignment", idempotencyKey);
    if (cached) return cached;

    const record = {
      ...assignment,
      id: assignment.id || createId("assignment"),
      createdAt: assignment.createdAt || nowIso(now),
      updatedAt: assignment.updatedAt || nowIso(now)
    };
    assignments.set(record.id, record);
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

