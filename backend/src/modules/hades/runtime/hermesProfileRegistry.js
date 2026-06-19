import { createHash, randomUUID } from "node:crypto";

function hashKey(key) {
  return "sha256:" + createHash("sha256").update(key).digest("hex");
}

export function createHermesProfileRegistry({ storage = "memory", supabaseClient } = {}) {
  const profiles = new Map();

  function stripSecret(record) {
    const { apiServerKey, ...rest } = record;
    return { ...rest, apiServerKeyHash: hashKey(apiServerKey || "") };
  }

  async function upsertProfile({ tenantId, userId, profileName, hermesHome, apiHost, apiPort, edgeBaseUrl, apiServerKey, gatewayStatus }) {
    const id = profileName || `${tenantId}_${userId}`;
    const record = {
      id,
      tenantId,
      userId,
      profileName: id,
      hermesHome: hermesHome || "",
      apiHost: apiHost || "127.0.0.1",
      apiPort: apiPort || 0,
      edgeBaseUrl: edgeBaseUrl || "",
      apiServerKey: apiServerKey || "",
      gatewayStatus: gatewayStatus || "unknown",
    };
    profiles.set(id, record);
    return stripSecret(record);
  }

  async function findProfile(query) {
    if (query.profileName) {
      const record = profiles.get(query.profileName);
      return record ? stripSecret(record) : null;
    }
    if (query.tenantId && query.userId) {
      for (const record of profiles.values()) {
        if (record.tenantId === query.tenantId && record.userId === query.userId) {
          return stripSecret(record);
        }
      }
    }
    return null;
  }

  async function getApiServerKey(query) {
    const name = typeof query === "string" ? query : query?.profileName;
    if (!name) return null;
    const record = profiles.get(name);
    return record?.apiServerKey || null;
  }

  return { upsertProfile, findProfile, getApiServerKey };
}
