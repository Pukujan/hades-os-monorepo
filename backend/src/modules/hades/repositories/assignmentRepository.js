import { persistTable, readTableRows } from "./_supabase.js";

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createAssignmentRepository({ storage = "memory", supabaseClient, tableName = "hades_assignments" } = {}) {
  const assignments = new Map();
  let hydrated = false;

  async function hydrate() {
    if (storage !== "supabase" || hydrated) return;
    hydrated = true;
    for (const row of await readTableRows(supabaseClient, tableName)) {
      if (!row?.id) continue;
      assignments.set(row.id, { ...row });
    }
  }

  async function persist(row, mode = "upsert") {
    if (storage === "supabase") {
      await persistTable(supabaseClient, tableName, mode, row);
    }
  }

  async function create({ userId, tenantId, data }) {
    await hydrate();
    const record = {
      ...data,
      id: data.id || createId("assign"),
      user_id: userId,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    assignments.set(record.id, record);
    await persist(record);
    return record;
  }

  async function findActiveAssignment({ userId, tenantId, provider, commandName, channelId, triggerType }) {
    await hydrate();
    for (const record of assignments.values()) {
      if (record.user_id !== userId) continue;
      if (record.tenant_id !== tenantId) continue;
      if (record.status !== "active") continue;
      if (provider && record.provider !== provider) continue;
      if (commandName != null && record.command_name !== commandName) continue;
      return record;
    }
    return null;
  }

  async function findById({ id, userId, tenantId }) {
    await hydrate();
    const record = assignments.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    return record;
  }

  async function listByUser({ userId, tenantId }) {
    await hydrate();
    return [...assignments.values()].filter(
      (a) => a.user_id === userId && a.tenant_id === tenantId
    );
  }

  async function update({ id, userId, tenantId, patch }) {
    await hydrate();
    const record = assignments.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    const updated = { ...record, ...patch, updated_at: new Date().toISOString() };
    assignments.set(id, updated);
    await persist(updated);
    return updated;
  }

  async function remove({ id, userId, tenantId }) {
    await hydrate();
    const record = assignments.get(id) || null;
    if (!record) return false;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return false;
    assignments.delete(id);
    return true;
  }

  return { create, findActiveAssignment, findById, listByUser, update, delete: remove };
}
