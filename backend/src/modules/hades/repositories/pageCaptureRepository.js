import { persistTable, readTableRows, deleteTableRow } from "./_supabase.js";
import { randomUUID } from "node:crypto";

export function createPageCaptureRepository({ storage = "memory", supabaseClient, tableName = "hades_extension_page_captures" } = {}) {
  const captures = new Map();
  let hydrated = false;

  async function hydrate() {
    if (storage !== "supabase" || hydrated) return;
    hydrated = true;
    for (const row of await readTableRows(supabaseClient, tableName)) {
      if (!row?.id) continue;
      captures.set(row.id, { ...row });
    }
  }

  async function persist(row, mode = "insert") {
    if (storage === "supabase") {
      await persistTable(supabaseClient, tableName, mode, row);
    }
  }

  async function create({ userId, tenantId, url, title, selectedText, fullText }) {
    await hydrate();
    const id = randomUUID();
    const record = {
      id,
      user_id: userId,
      tenant_id: tenantId,
      url: url || null,
      title: title || null,
      selected_text: selectedText || null,
      full_text: fullText || null,
      created_at: new Date().toISOString(),
    };
    captures.set(id, record);
    await persist(record);
    return record;
  }

  async function listByUser({ userId, tenantId }) {
    await hydrate();
    return [...captures.values()].filter(
      (r) => r.user_id === userId && r.tenant_id === tenantId
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async function deleteRecord({ id, userId, tenantId }) {
    await hydrate();
    const record = captures.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    captures.delete(id);
    if (storage === "supabase") {
      await deleteTableRow(supabaseClient, tableName, id);
    }
    return record;
  }

  return { create, listByUser, delete: deleteRecord };
}
