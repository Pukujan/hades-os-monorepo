import { persistTable, readTableRows } from "./_supabase.js";

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function stripSecrets(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const str = JSON.stringify(obj);
  const cleaned = str.replace(/"botToken"\s*:\s*"[^"]*"/g, '"botToken":"[REDACTED]"');
  const cleaned2 = cleaned.replace(/"encrypted_bot_token"\s*:\s*"[^"]*"/g, '"encrypted_bot_token":"[REDACTED]"');
  try {
    return JSON.parse(cleaned2);
  } catch {
    return obj;
  }
}

export function createAgentExecutionRepository({ storage = "memory", supabaseClient, tableName = "hades_agent_executions" } = {}) {
  const executions = new Map();
  let hydrated = false;

  function hydrate() {
    if (storage !== "supabase" || hydrated) return;
    hydrated = true;
    for (const row of readTableRows(supabaseClient, tableName)) {
      if (!row?.id) continue;
      executions.set(row.id, { ...row });
    }
  }

  async function persist(row) {
    if (storage === "supabase") {
      await persistTable(supabaseClient, tableName, "insert", row);
    }
  }

  async function create({ userId, tenantId, data }) {
    hydrate();
    const safeData = stripSecrets(data);
    const record = {
      ...safeData,
      id: safeData.id || createId("exec"),
      user_id: userId,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
    };
    executions.set(record.id, record);
    await persist(record);
    return record;
  }

  async function findById({ id, userId, tenantId }) {
    hydrate();
    const record = executions.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    return record;
  }

  async function listByUser({ userId, tenantId }) {
    hydrate();
    return [...executions.values()].filter(
      (e) => e.user_id === userId && e.tenant_id === tenantId
    );
  }

  return { create, findById, listByUser };
}
