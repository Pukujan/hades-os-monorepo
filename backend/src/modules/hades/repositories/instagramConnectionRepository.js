import { persistTable, readTableRows, deleteTableRow } from "./_supabase.js";
import { randomUUID } from "node:crypto";

export function createInstagramConnectionRepository({ storage = "memory", supabaseClient, tableName = "hades_instagram_connections" } = {}) {
  const connections = new Map();
  const byExternalConnectionId = new Map();
  let hydrated = false;

  async function hydrate() {
    if (storage !== "supabase" || hydrated) return;
    hydrated = true;
    for (const row of await readTableRows(supabaseClient, tableName)) {
      if (!row?.id) continue;
      connections.set(row.id, { ...row });
      if (row.external_connection_id) {
        byExternalConnectionId.set(row.external_connection_id, connections.get(row.id));
      }
    }
  }

  async function persist(row, mode = "upsert") {
    if (storage === "supabase") {
      await persistTable(supabaseClient, tableName, mode, row);
    }
  }

  async function findRecord({ userId, tenantId }) {
    await hydrate();
    for (const record of connections.values()) {
      if (record.user_id === userId && record.tenant_id === tenantId) {
        return record;
      }
    }
    return null;
  }

  async function createOrUpdate({ userId, tenantId, connector, externalConnectionId, instagramBusinessAccountId, handle, status, capabilities }) {
    await hydrate();
    const existing = await findRecord({ userId, tenantId });
    const id = existing?.id || randomUUID();

    const record = {
      id,
      user_id: userId,
      tenant_id: tenantId,
      external_connection_id: externalConnectionId || existing?.external_connection_id || null,
      instagram_business_account_id: instagramBusinessAccountId || existing?.instagram_business_account_id || null,
      handle: handle || existing?.handle || null,
      connector: connector || existing?.connector || "composio",
      status: status || existing?.status || "connected",
      capabilities: capabilities || existing?.capabilities || [],
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    connections.set(id, record);
    if (record.external_connection_id) {
      byExternalConnectionId.set(record.external_connection_id, record);
    }
    await persist(record);
    return record;
  }

  async function findPublicByUser({ userId, tenantId }) {
    await hydrate();
    for (const record of connections.values()) {
      if (record.user_id === userId && record.tenant_id === tenantId) {
        const { capabilities, ...rest } = record;
        return { ...rest, capabilities: capabilities || [] };
      }
    }
    return null;
  }

  async function findRuntimeByExternalConnectionId({ externalConnectionId }) {
    await hydrate();
    const record = byExternalConnectionId.get(externalConnectionId) || null;
    if (!record) return null;
    return {
      composioConnectionId: record.external_connection_id,
      instagramBusinessAccountId: record.instagram_business_account_id,
      handle: record.handle,
    };
  }

  async function deleteRecord({ userId, tenantId }) {
    await hydrate();
    const record = await findRecord({ userId, tenantId });
    if (!record) return null;
    connections.delete(record.id);
    if (record.external_connection_id) {
      byExternalConnectionId.delete(record.external_connection_id);
    }
    if (storage === "supabase") {
      await deleteTableRow(supabaseClient, tableName, record.id);
    }
    return record;
  }

  return { createOrUpdate, findPublicByUser, findRuntimeByExternalConnectionId, findRecord, delete: deleteRecord };
}
