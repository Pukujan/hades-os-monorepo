import { persistTable, readTableRows } from "./_supabase.js";

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createMinionRepository({ storage = "memory", supabaseClient, tableName = "hades_minions" } = {}) {
  const minions = new Map();
  let hydrated = false;

  function hydrate() {
    if (storage !== "supabase" || hydrated) return;
    hydrated = true;
    for (const row of readTableRows(supabaseClient, tableName)) {
      if (!row?.id) continue;
      minions.set(row.id, { ...row });
    }
  }

  async function persist(row, mode = "upsert") {
    if (storage === "supabase") {
      await persistTable(supabaseClient, tableName, mode, row);
    }
  }

  async function create({ userId, tenantId, data }) {
    hydrate();
    const record = {
      ...data,
      id: data.id || createId("minion"),
      user_id: userId,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    minions.set(record.id, record);
    await persist(record);
    return record;
  }

  async function findById({ id, userId, tenantId }) {
    hydrate();
    const record = minions.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    return record;
  }

  async function listByUser({ userId, tenantId }) {
    hydrate();
    return [...minions.values()].filter(
      (m) => m.user_id === userId && m.tenant_id === tenantId
    );
  }

  async function update({ id, userId, tenantId, patch }) {
    hydrate();
    const record = minions.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    const updated = { ...record, ...patch, updated_at: new Date().toISOString() };
    minions.set(id, updated);
    await persist(updated);
    return updated;
  }

  async function remove({ id, userId, tenantId }) {
    hydrate();
    const record = minions.get(id) || null;
    if (!record) return false;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return false;
    minions.delete(id);
    return true;
  }

  return { create, findById, listByUser, update, delete: remove };
}
