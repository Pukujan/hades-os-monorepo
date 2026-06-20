import { randomUUID, createHash } from "node:crypto";
import { persistTable, readTableRows } from "../repositories/_supabase.js";

const TABLE = "hades_extension_keys";

function hashKey(key) {
  return createHash("sha256").update(key).digest("hex");
}

function generateKey() {
  return "hx_" + randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
}

export function createExtensionKeyRepository({ storage = "memory", supabaseClient } = {}) {
  const keys = new Map();
  const keyHashes = new Map();
  let hydrated = false;

  async function hydrate() {
    if (hydrated || storage !== "supabase") return;
    for (const row of await readTableRows(supabaseClient, TABLE)) {
      if (!row?.id) continue;
      keys.set(row.id, { ...row });
      if (row.key_hash) keyHashes.set(row.key_hash, row.id);
    }
    hydrated = true;
  }

  async function persist(row, mode = "insert") {
    if (storage === "supabase") {
      await persistTable(supabaseClient, TABLE, mode, row);
    }
  }

  async function createKey({ userId, tenantId, data }) {
    await hydrate();
    for (const [id, existing] of keys) {
      if (existing.user_id === userId && existing.tenant_id === tenantId && !existing.revoked_at) {
        existing.revoked_at = new Date().toISOString();
        existing.updated_at = new Date().toISOString();
        keys.set(id, existing);
        await persist(existing, "upsert");
      }
    }
    const plaintextKey = generateKey();
    const keyHash = hashKey(plaintextKey);
    const record = {
      id: data.id || randomUUID(),
      name: data.name || "Unnamed key",
      scopes: data.scopes || [],
      key_hash: keyHash,
      user_id: userId,
      tenant_id: tenantId,
      revoked_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    keys.set(record.id, record);
    keyHashes.set(keyHash, record.id);
    await persist(record, "insert");
    return { plaintextKey, record };
  }

  async function rotateKey({ id, userId, tenantId }) {
    await hydrate();
    const record = keys.get(id);
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    keyHashes.delete(record.key_hash);
    const newPlaintext = generateKey();
    const newHash = hashKey(newPlaintext);
    record.key_hash = newHash;
    record.updated_at = new Date().toISOString();
    keys.set(id, record);
    keyHashes.set(newHash, id);
    await persist(record, "upsert");
    return { plaintextKey: newPlaintext, record };
  }

  async function revokeKey({ id, userId, tenantId }) {
    await hydrate();
    const record = keys.get(id);
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    record.revoked_at = new Date().toISOString();
    record.updated_at = new Date().toISOString();
    keys.set(id, record);
    await persist(record, "upsert");
    return record;
  }

  async function verifyKey({ plaintextKey, requiredScope }) {
    await hydrate();
    const keyHash = hashKey(plaintextKey);
    const recordId = keyHashes.get(keyHash);
    if (!recordId) return null;
    const record = keys.get(recordId);
    if (!record) return null;
    if (record.revoked_at) return null;
    if (requiredScope && !record.scopes.includes("*") && !record.scopes.includes(requiredScope)) return null;
    return { id: record.id, scopes: record.scopes, userId: record.user_id, tenantId: record.tenant_id };
  }

  async function listKeys({ userId, tenantId }) {
    await hydrate();
    return [...keys.values()].filter(
      (k) => k.user_id === userId && k.tenant_id === tenantId
    );
  }

  return { createKey, rotateKey, revokeKey, verifyKey, listKeys };
}
