import { randomUUID } from "crypto";
import {
  SOCIAL_LINKS,
  createEmptyDraft,
  createInitialMessages,
  createStarterOwnedMinions,
  deriveLevelState
} from "../data.js";

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
  const agentExecutions = new Map();
  const idempotency = new Map();
  const sequenceByConversation = new Map();
  let hydratedFromSupabase = false;

  function remember(scope, key, value) {
    idempotency.set(createIdempotencyKey(scope, key), value);
    return value;
  }

  function recall(scope, key) {
    return idempotency.get(createIdempotencyKey(scope, key)) || null;
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function readTableRows(tableName) {
    const rows = supabaseClient?.tables?.[tableName];
    return Array.isArray(rows) ? rows.map((row) => clone(row)) : [];
  }

  function hydrateFromSupabase() {
    if (storage !== "supabase" || hydratedFromSupabase) return;
    hydratedFromSupabase = true;

    for (const row of readTableRows("conversations")) {
      if (!row?.id) continue;
      conversations.set(row.id, {
        id: row.id,
        userId: row.userId || "local-user",
        draftSnapshot: row.draftSnapshot ? clone(row.draftSnapshot) : null,
        createdAt: row.createdAt || nowIso(now),
        updatedAt: row.updatedAt || nowIso(now)
      });
      if (!messages.has(row.id)) {
        messages.set(row.id, []);
      }
      sequenceByConversation.set(row.id, sequenceByConversation.get(row.id) || 0);
    }

    for (const row of readTableRows("chat_messages")) {
      if (!row?.conversationId) continue;
      if (!messages.has(row.conversationId)) {
        messages.set(row.conversationId, []);
      }
      messages.get(row.conversationId).push(clone(row));
      const currentSequence = sequenceByConversation.get(row.conversationId) || 0;
      const nextSequence = Number(row.sequenceNumber || 0);
      sequenceByConversation.set(row.conversationId, Math.max(currentSequence, nextSequence));
      if (!conversations.has(row.conversationId)) {
        conversations.set(row.conversationId, {
          id: row.conversationId,
          userId: row.userId || "local-user",
          draftSnapshot: null,
          createdAt: row.createdAt || nowIso(now),
          updatedAt: row.updatedAt || nowIso(now)
        });
      }
    }

    for (const row of readTableRows("minions")) {
      if (!row?.id) continue;
      minions.set(row.id, clone(row));
    }

    for (const row of readTableRows("minion_assignments")) {
      if (!row?.id) continue;
      assignments.set(row.id, clone(row));
    }

    for (const row of readTableRows("minion_test_runs")) {
      if (!row?.id) continue;
      testRuns.set(row.id, clone(row));
    }

    for (const row of readTableRows("agent_executions")) {
      if (!row?.id) continue;
      agentExecutions.set(row.id, clone(row));
    }
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

  async function persistAgentExecution(client, execution) {
    await persistTable(client, "agent_executions", "upsert", execution);
  }

  function getOrCreateConversation({ conversationId, userId = "local-user" } = {}) {
    hydrateFromSupabase();
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
    hydrateFromSupabase();
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
    hydrateFromSupabase();
    const conversation = getOrCreateConversation({ conversationId });
    conversation.draftSnapshot = draftSnapshot ? JSON.parse(JSON.stringify(draftSnapshot)) : null;
    conversation.updatedAt = nowIso(now);
    const client = storage === "supabase" ? supabaseClient : null;
    await persistConversation(client, conversation);
    return conversation;
  }

  async function saveTestRun({ idempotencyKey, run }) {
    hydrateFromSupabase();
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
    hydrateFromSupabase();
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
    hydrateFromSupabase();
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

  async function saveAgentExecution({ idempotencyKey, execution }) {
    hydrateFromSupabase();
    const cached = recall("agentExecution", idempotencyKey);
    if (cached) return cached;

    const record = {
      ...execution,
      id: execution.id || createId("agentexec"),
      createdAt: execution.createdAt || nowIso(now),
      updatedAt: execution.updatedAt || nowIso(now),
      idempotencyKey
    };
    agentExecutions.set(record.id, record);
    const client = storage === "supabase" ? supabaseClient : null;
    await persistAgentExecution(client, record);
    return remember("agentExecution", idempotencyKey, record);
  }

  function listMessages(conversationId) {
    hydrateFromSupabase();
    return [...(messages.get(conversationId) || [])];
  }

  function getMinion(id) {
    hydrateFromSupabase();
    return minions.get(id) || null;
  }

  function listMinions() {
    hydrateFromSupabase();
    return [...minions.values()];
  }

  function listAssignments() {
    hydrateFromSupabase();
    return [...assignments.values()];
  }

  function listAgentExecutions() {
    hydrateFromSupabase();
    return [...agentExecutions.values()];
  }

  function listTestRuns() {
    hydrateFromSupabase();
    return [...testRuns.values()];
  }

  function getBootstrapState({ userId = "local-user", conversationId = null } = {}) {
    hydrateFromSupabase();
    const conversation = getOrCreateConversation({ conversationId, userId });
    const storedMessages = listMessages(conversation.id);
    const starterMessages = createInitialMessages().map((message) => ({
      ...message,
      userId,
      conversationId: conversation.id
    }));
    const ownedMinions = listMinions();
    const starterMinions = createStarterOwnedMinions(nowIso(now));
    const nextMinions = [
      ...starterMinions,
      ...ownedMinions.filter((minion) => !starterMinions.some((starter) => starter.id === minion.id))
    ];

    return {
      userId,
      conversationId: conversation.id,
      messages: storedMessages.length ? storedMessages : starterMessages,
      draft: conversation.draftSnapshot || createEmptyDraft(),
      minions: nextMinions,
      assignments: listAssignments(),
      socialLinks: SOCIAL_LINKS,
      levelState: deriveLevelState(nextMinions.length, nowIso(now)),
      source: storage === "supabase" ? "supabase" : "memory"
    };
  }

  function getSnapshot() {
    hydrateFromSupabase();
    return {
      conversations: [...conversations.values()],
      messages: [...messages.entries()].flatMap(([conversationId, entries]) => entries.map((entry) => ({ ...entry, conversationId }))),
      minions: [...minions.values()],
      assignments: [...assignments.values()],
      agentExecutions: [...agentExecutions.values()],
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
    saveAgentExecution,
    listMessages,
    listMinions,
    listAssignments,
    listAgentExecutions,
    listTestRuns,
    getMinion,
    getBootstrapState,
    getSnapshot
  };
}
