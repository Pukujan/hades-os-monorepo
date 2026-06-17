import { persistTable, readTableRows } from "./_supabase.js";
import { randomUUID } from "node:crypto";

export function createMemoryRecordRepository({ storage = "memory", supabaseClient, tableName = "hades_memory_records" } = {}) {
  const records = new Map();
  let hydrated = false;

  async function hydrate() {
    if (storage !== "supabase" || hydrated) return;
    hydrated = true;
    for (const row of await readTableRows(supabaseClient, tableName)) {
      if (!row?.id) continue;
      records.set(row.id, { ...row });
    }
  }

  async function persist(row) {
    if (storage === "supabase") {
      await persistTable(supabaseClient, tableName, "insert", row);
    }
  }

  async function create({ userId, tenantId, data }) {
    await hydrate();
    const record = {
      ...data,
      id: data.id || randomUUID(),
      user_id: userId,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
    };
    records.set(record.id, record);
    await persist(record);
    return record;
  }

  async function listByUser({ userId, tenantId }) {
    await hydrate();
    return [...records.values()].filter(
      (r) => r.user_id === userId && r.tenant_id === tenantId
    );
  }

  async function findById({ id, userId, tenantId }) {
    await hydrate();
    const record = records.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    return record;
  }

  async function remove({ id, userId, tenantId }) {
    await hydrate();
    const record = records.get(id) || null;
    if (!record) return false;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return false;
    records.delete(id);
    return true;
  }

  return { create, listByUser, findById, delete: remove };
}
