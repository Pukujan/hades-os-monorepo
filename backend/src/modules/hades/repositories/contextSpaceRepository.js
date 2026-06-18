import { persistTable, readTableRows, deleteTableRow } from "./_supabase.js";
import { randomUUID } from "node:crypto";

export function createContextSpaceRepository({ storage = "memory", supabaseClient, tableName = "hades_extension_context_spaces" } = {}) {
  const spaces = new Map();
  let hydrated = false;

  async function hydrate() {
    if (storage !== "supabase" || hydrated) return;
    hydrated = true;
    for (const row of await readTableRows(supabaseClient, tableName)) {
      if (!row?.id) continue;
      spaces.set(row.id, { ...row });
    }
  }

  async function persist(row, mode = "upsert") {
    if (storage === "supabase") {
      await persistTable(supabaseClient, tableName, mode, row);
    }
  }

  async function findByName({ userId, tenantId, name }) {
    await hydrate();
    for (const record of spaces.values()) {
      if (record.user_id === userId && record.tenant_id === tenantId && record.name === name) {
        return record;
      }
    }
    return null;
  }

  async function createOrUpdate({ userId, tenantId, name, content }) {
    await hydrate();
    const existing = await findByName({ userId, tenantId, name });
    const id = existing?.id || randomUUID();
    const record = {
      id,
      user_id: userId,
      tenant_id: tenantId,
      name: name || "untitled",
      content: content || "",
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    spaces.set(id, record);
    await persist(record);
    return record;
  }

  async function listByUser({ userId, tenantId }) {
    await hydrate();
    return [...spaces.values()].filter(
      (r) => r.user_id === userId && r.tenant_id === tenantId
    ).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }

  async function deleteRecord({ id, userId, tenantId }) {
    await hydrate();
    const record = spaces.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    spaces.delete(id);
    if (storage === "supabase") {
      await deleteTableRow(supabaseClient, tableName, id);
    }
    return record;
  }

  return { createOrUpdate, listByUser, findByName, delete: deleteRecord };
}
