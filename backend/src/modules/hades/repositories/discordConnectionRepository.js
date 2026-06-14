function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDiscordConnectionRepository({ storage = "memory" } = {}) {
  const connections = new Map();
  const byDiscordUserId = new Map();

  async function createOrUpdate({ userId, tenantId, discordUserId, guildId, channelId, status }) {
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
    return record;
  }

  async function findPublicByUser({ userId, tenantId }) {
    for (const record of connections.values()) {
      if (record.user_id === userId && record.tenant_id === tenantId) {
        return record;
      }
    }
    return null;
  }

  async function findByDiscordUserId({ discordUserId }) {
    return byDiscordUserId.get(discordUserId) || null;
  }

  return { createOrUpdate, findPublicByUser, findByDiscordUserId };
}
