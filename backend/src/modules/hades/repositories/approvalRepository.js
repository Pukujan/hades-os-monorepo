import { persistTable, readTableRows } from "./_supabase.js";
import { randomUUID } from "node:crypto";

export function createApprovalRepository({ storage = "memory", supabaseClient, tableName = "hades_extension_approvals" } = {}) {
  const approvals = new Map();
  let hydrated = false;

  async function hydrate() {
    if (storage !== "supabase" || hydrated) return;
    hydrated = true;
    for (const row of await readTableRows(supabaseClient, tableName)) {
      if (!row?.id) continue;
      approvals.set(row.id, { ...row });
    }
  }

  async function persist(row, mode = "upsert") {
    if (storage === "supabase") {
      await persistTable(supabaseClient, tableName, mode, row);
    }
  }

  async function create({ userId, tenantId, actionType, description, payload }) {
    await hydrate();
    const id = randomUUID();
    const record = {
      id,
      user_id: userId,
      tenant_id: tenantId,
      action_type: actionType || null,
      description: description || null,
      payload: payload || {},
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    approvals.set(id, record);
    await persist(record, "insert");
    return record;
  }

  async function listPending({ userId, tenantId }) {
    await hydrate();
    return [...approvals.values()].filter(
      (r) => r.user_id === userId && r.tenant_id === tenantId && r.status === "pending"
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async function decide({ id, userId, tenantId, status }) {
    await hydrate();
    const record = approvals.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    record.status = status;
    record.updated_at = new Date().toISOString();
    approvals.set(id, record);
    await persist(record);
    return record;
  }

  return { create, listPending, decide };
}
