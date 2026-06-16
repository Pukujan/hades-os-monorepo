import { persistTable, readTableRows } from "./_supabase.js";
import { randomUUID } from "node:crypto";

function createId() {
  return randomUUID();
}

export function createDiscordConnectionRepository({ storage = "memory", supabaseClient, tableName = "hades_discord_connections" } = {}) {
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
    const id = existing?.id || createId("dconn");
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

  async function findPublicByUser({ userId, tenantId }) {
    await hydrate();
    for (const record of connections.values()) {
      if (record.user_id === userId && record.tenant_id === tenantId) {
        return record;
      }
    }
    return null;
  }

  async function findByDiscordUserId({ discordUserId }) {
    await hydrate();
    return byDiscordUserId.get(discordUserId) || null;
  }

  return { createOrUpdate, findPublicByUser, findByDiscordUserId };
}
