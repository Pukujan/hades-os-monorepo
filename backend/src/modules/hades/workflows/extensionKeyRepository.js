import { randomUUID, createHash } from "node:crypto";

function hashKey(key) {
  return createHash("sha256").update(key).digest("hex");
}

function generateKey() {
  return "hx_" + randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
}

export function createExtensionKeyRepository({ storage = "memory" } = {}) {
  const keys = new Map();
  const keyHashes = new Map();

  async function createKey({ userId, tenantId, data }) {
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
    return { plaintextKey, record };
  }

  async function rotateKey({ id, userId, tenantId }) {
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
    return { plaintextKey: newPlaintext, record };
  }

  async function revokeKey({ id, userId, tenantId }) {
    const record = keys.get(id);
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    record.revoked_at = new Date().toISOString();
    record.updated_at = new Date().toISOString();
    keys.set(id, record);
    return record;
  }

  async function verifyKey({ plaintextKey, requiredScope }) {
    const keyHash = hashKey(plaintextKey);
    const recordId = keyHashes.get(keyHash);
    if (!recordId) return null;
    const record = keys.get(recordId);
    if (!record) return null;
    if (record.revoked_at) return null;
    if (requiredScope && !record.scopes.includes(requiredScope)) return null;
    return { id: record.id, scopes: record.scopes, userId: record.user_id, tenantId: record.tenant_id };
  }

  async function listKeys({ userId, tenantId }) {
    return [...keys.values()].filter(
      (k) => k.user_id === userId && k.tenant_id === tenantId
    );
  }

  return { createKey, rotateKey, revokeKey, verifyKey, listKeys };
}
