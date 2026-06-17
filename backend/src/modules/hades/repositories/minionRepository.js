import { persistTable, readTableRows } from "./_supabase.js";
import { randomUUID } from "node:crypto";

function createId() {
  return randomUUID();
}

export function createMinionRepository({ storage = "memory", supabaseClient, tableName = "hades_minions" } = {}) {
  const minions = new Map();
  let hydrated = false;

  async function hydrate({ force = false } = {}) {
    if (storage !== "supabase") return;
    if (hydrated && !force) return;

    hydrated = true;
    minions.clear();
    for (const row of await readTableRows(supabaseClient, tableName)) {
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
    await hydrate();
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
    await hydrate();
    const record = minions.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    return record;
  }

  async function listByUser({ userId, tenantId }) {
    await hydrate();
    return [...minions.values()].filter(
      (m) => m.user_id === userId && m.tenant_id === tenantId
    );
  }

  async function update({ id, userId, tenantId, patch }) {
    await hydrate();
    const record = minions.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    const updated = { ...record, ...patch, updated_at: new Date().toISOString() };
    minions.set(id, updated);
    await persist(updated);
    return updated;
  }

  async function remove({ id, userId, tenantId }) {
    await hydrate();
    const record = minions.get(id) || null;
    if (!record) return false;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return false;
    minions.delete(id);
    return true;
  }

  async function refresh() {
    await hydrate({ force: true });
  }

  return { create, findById, listByUser, update, delete: remove, refresh };
}
