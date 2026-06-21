import { createHash } from "node:crypto";

function hashKey(key) {
  return "sha256:" + createHash("sha256").update(key).digest("hex");
}

function missingCrypto(action) {
  return Object.assign(
    new Error(`Crypto dependency is required to ${action} Hermes profile API keys`),
    { code: "missing_crypto" },
  );
}

function requireCrypto(crypto, action) {
  if (!crypto || typeof crypto.encrypt !== "function" || typeof crypto.decrypt !== "function") {
    throw missingCrypto(action);
  }
  return crypto;
}

function stripSecret(record) {
  if (!record) return null;
  const { apiServerKey, ...rest } = record;
  return {
    ...rest,
    apiServerKeyHash: record.apiServerKeyHash || hashKey(apiServerKey || ""),
  };
}

function rowFromRecord(record, crypto) {
  const keyCrypto = requireCrypto(crypto, "store");
  const apiServerKey = record.apiServerKey || "";
  return {
    id: record.id,
    tenant_id: record.tenantId,
    user_id: record.userId,
    profile_name: record.profileName,
    hermes_home: record.hermesHome || "",
    api_host: record.apiHost || "127.0.0.1",
    api_port: record.apiPort || 0,
    edge_base_url: record.edgeBaseUrl || "",
    encrypted_api_server_key: keyCrypto.encrypt(apiServerKey),
    api_server_key_hash: record.apiServerKeyHash || hashKey(apiServerKey),
    gateway_status: record.gatewayStatus || "unknown",
    updated_at: new Date().toISOString(),
  };
}

function recordFromRow(row, crypto) {
  if (!row?.id) return null;
  const keyCrypto = requireCrypto(crypto, "read");
  const apiServerKey = row.encrypted_api_server_key
    ? keyCrypto.decrypt(row.encrypted_api_server_key)
    : "";
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    profileName: row.profile_name || row.id,
    hermesHome: row.hermes_home || "",
    apiHost: row.api_host || "127.0.0.1",
    apiPort: row.api_port || 0,
    edgeBaseUrl: row.edge_base_url || "",
    apiServerKey,
    apiServerKeyHash: row.api_server_key_hash || hashKey(apiServerKey),
    gatewayStatus: row.gateway_status || "unknown",
  };
}

export function createHermesProfileRegistry({
  storage = "memory",
  supabaseClient,
  crypto = null,
  tableName = "hades_hermes_profiles",
} = {}) {
  const profiles = new Map();
  const useSupabase = storage === "supabase" && supabaseClient;

  async function readRows() {
    if (!useSupabase) return [];
    const { data, error } = await supabaseClient.from(tableName).select("*");
    if (error) {
      throw new Error(`Supabase read error (${tableName}): ${error.message}`);
    }
    return Array.isArray(data) ? data : [];
  }

  async function hydrate() {
    if (!useSupabase) return;
    const rows = await readRows();
    for (const row of rows) {
      const record = recordFromRow(row, crypto);
      if (record?.profileName) profiles.set(record.profileName, record);
    }
  }

  async function persist(record) {
    if (!useSupabase) return;
    const row = rowFromRecord(record, crypto);
    const { error } = await supabaseClient.from(tableName).upsert(row);
    if (error) {
      throw new Error(`Supabase persist error (${tableName}): ${error.message}`);
    }
  }

  async function upsertProfile({ tenantId, userId, profileName, hermesHome, apiHost, apiPort, edgeBaseUrl, apiServerKey, gatewayStatus }) {
    await hydrate();
    const id = profileName || `${tenantId}_${userId}`;
    const existing = profiles.get(id) || null;
    const savedApiServerKey = apiServerKey || existing?.apiServerKey || "";
    const record = {
      id,
      tenantId,
      userId,
      profileName: id,
      hermesHome: hermesHome || existing?.hermesHome || "",
      apiHost: apiHost || existing?.apiHost || "127.0.0.1",
      apiPort: apiPort || existing?.apiPort || 0,
      edgeBaseUrl: edgeBaseUrl || existing?.edgeBaseUrl || "",
      apiServerKey: savedApiServerKey,
      apiServerKeyHash: hashKey(savedApiServerKey),
      gatewayStatus: gatewayStatus || existing?.gatewayStatus || "unknown",
    };
    profiles.set(id, record);
    await persist(record);
    return stripSecret(record);
  }

  async function findProfile(query) {
    await hydrate();
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
    await hydrate();
    const name = typeof query === "string" ? query : query?.profileName;
    if (!name) return null;
    const record = profiles.get(name);
    return record?.apiServerKey || null;
  }

  return { upsertProfile, findProfile, getApiServerKey };
}
