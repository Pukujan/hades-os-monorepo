import { persistTable, readTableRows, deleteTableRow } from "./_supabase.js";
import { randomUUID } from "node:crypto";

function last4(token) {
  if (!token || token.length < 4) return token || "";
  return token.slice(-4);
}

export function createGitHubConnectionRepository({ storage = "memory", supabaseClient, tableName = "hades_github_connections", crypto = null } = {}) {
  const connections = new Map();
  let hydrated = false;

  async function hydrate() {
    if (storage !== "supabase" || hydrated) return;
    hydrated = true;
    for (const row of await readTableRows(supabaseClient, tableName)) {
      if (!row?.id) continue;
      connections.set(row.id, { ...row });
    }
  }

  async function persist(row, mode = "upsert") {
    if (storage === "supabase") {
      await persistTable(supabaseClient, tableName, mode, row);
    }
  }

  async function saveToken({ userId, tenantId, token, gitHubUsername }) {
    await hydrate();
    if (!crypto || typeof crypto.encrypt !== "function") {
      throw Object.assign(
        new Error("Crypto dependency is required to store GitHub tokens"),
        { code: "missing_crypto" }
      );
    }
    const existing = await findRecord({ userId, tenantId });
    const id = existing?.id || randomUUID();
    const encrypted = crypto.encrypt(token);

    const record = {
      id,
      user_id: userId,
      tenant_id: tenantId,
      encrypted_token: encrypted,
      token_last4: last4(token),
      github_username: gitHubUsername || null,
      status: "connected",
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    connections.set(id, record);
    await persist(record);
    return record;
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

  async function findPublicByUser({ userId, tenantId }) {
    await hydrate();
    for (const record of connections.values()) {
      if (record.user_id === userId && record.tenant_id === tenantId) {
        const { encrypted_token, token, ...rest } = record;
        return rest;
      }
    }
    return null;
  }

  async function findRuntimeTokenByUserId({ userId, tenantId }) {
    await hydrate();
    const record = await findRecord({ userId, tenantId });
    if (!record) return null;
    if (!crypto || typeof crypto.decrypt !== "function") {
      throw Object.assign(
        new Error("Crypto dependency is required to decrypt GitHub tokens"),
        { code: "missing_crypto" }
      );
    }
    return { botToken: crypto.decrypt(record.encrypted_token) };
  }

  async function deleteRecord({ id }) {
    await hydrate();
    const record = connections.get(id) || null;
    if (!record) return null;
    connections.delete(id);
    if (storage === "supabase") {
      await deleteTableRow(supabaseClient, tableName, id);
    }
    return record;
  }

  return { saveToken, findPublicByUser, findRuntimeTokenByUserId, findRecord, delete: deleteRecord };
}
