import { persistTable, readTableRows, deleteTableRow } from "./_supabase.js";
import { randomUUID } from "node:crypto";

function last4(token) {
  if (!token || token.length < 4) return token || "";
  return token.slice(-4);
}

export function createDiscordConnectionRepository({ storage = "memory", supabaseClient, tableName = "hades_discord_connections", crypto = null } = {}) {
  const connections = new Map();
  const byDiscordUserId = new Map();
  let hydrated = false;

  async function hydrate() {
    if (storage !== "supabase" || hydrated) return;
    hydrated = true;
    for (const row of await readTableRows(supabaseClient, tableName)) {
      if (!row?.id) continue;
      connections.set(row.id, { ...row });
      if (row.discord_user_id) {
        byDiscordUserId.set(row.discord_user_id, connections.get(row.id));
      }
    }
  }

  async function persist(row, mode = "upsert") {
    if (storage === "supabase") {
      await persistTable(supabaseClient, tableName, mode, row);
    }
  }

  async function createOrUpdate({ userId, tenantId, discordUserId, guildId, channelId, status }) {
    await hydrate();
    const existing = byDiscordUserId.get(discordUserId);
    const id = existing?.id || randomUUID();
    const record = {
      id,
      user_id: userId,
      tenant_id: tenantId,
      discord_user_id: discordUserId,
      guild_id: guildId || null,
      channel_id: channelId || null,
      status: status || "connected",
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    connections.set(id, record);
    byDiscordUserId.set(discordUserId, record);
    await persist(record);
    return record;
  }

  async function saveToken({ userId, tenantId, token, discordUserId, botUsername }) {
    await hydrate();
    if (!crypto || typeof crypto.encrypt !== "function") {
      throw Object.assign(
        new Error("Crypto dependency is required to store Discord bot tokens"),
        { code: "missing_crypto" }
      );
    }
    const existing = await findByUserId({ userId, tenantId });
    const id = existing?.id || randomUUID();
    const encrypted = crypto.encrypt(token);

    const record = {
      id,
      user_id: userId,
      tenant_id: tenantId,
      discord_user_id: discordUserId ?? existing?.discord_user_id ?? null,
      encrypted_bot_token: encrypted,
      token_last4: last4(token),
      bot_username: botUsername || null,
      status: "connected",
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    connections.set(id, record);
    await persist(record);
    return record;
  }

  async function findPublicByUser({ userId, tenantId }) {
    await hydrate();
    for (const record of connections.values()) {
      if (record.user_id === userId && record.tenant_id === tenantId) {
        const { encrypted_bot_token, bot_token, ...rest } = record;
        return rest;
      }
    }
    return null;
  }

  async function findByDiscordUserId({ discordUserId }) {
    await hydrate();
    return byDiscordUserId.get(discordUserId) || null;
  }

  async function findByUserId({ userId, tenantId }) {
    await hydrate();
    for (const record of connections.values()) {
      if (record.user_id === userId && record.tenant_id === tenantId) {
        return record;
      }
    }
    return null;
  }

  async function findRuntimeTokenByUserId({ userId, tenantId }) {
    await hydrate();
    const record = await findByUserId({ userId, tenantId });
    if (!record) return null;
    if (!crypto || typeof crypto.decrypt !== "function") {
      throw Object.assign(
        new Error("Crypto dependency is required to decrypt Discord bot tokens"),
        { code: "missing_crypto" }
      );
    }
    return { botToken: crypto.decrypt(record.encrypted_bot_token) };
  }

  async function deleteRecord({ id }) {
    await hydrate();
    const record = connections.get(id) || null;
    if (!record) return null;
    connections.delete(id);
    if (record.discord_user_id) {
      byDiscordUserId.delete(record.discord_user_id);
    }
    if (storage === "supabase") {
      await deleteTableRow(supabaseClient, tableName, id);
    }
    return record;
  }

  return { createOrUpdate, saveToken, findPublicByUser, findByDiscordUserId, findByUserId, findRuntimeTokenByUserId, delete: deleteRecord };
}
