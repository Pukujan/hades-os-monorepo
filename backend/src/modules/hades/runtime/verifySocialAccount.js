export function createVerifySocialAccount({ discordConnections, telegramConnections }) {
  return async function verifySocialAccount({ provider, accountId }) {
    if (provider === "discord") {
      const record = await discordConnections.findByDiscordUserId({ discordUserId: accountId });
      if (!record) {
        return { ok: false, code: "unknown_social_account" };
      }
      if (record.status !== "connected") {
        return { ok: false, code: "inactive_connection" };
      }
      return {
        connectionId: record.id,
        userId: record.user_id,
        tenantId: record.tenant_id,
        provider: "discord",
      };
    }

    if (provider === "telegram") {
      const record = await telegramConnections.findByTelegramUserId({ telegramUserId: accountId });
      if (!record) {
        return { ok: false, code: "unknown_social_account" };
      }
      if (record.status !== "connected") {
        return { ok: false, code: "inactive_connection" };
      }
      return {
        connectionId: record.id,
        userId: record.user_id,
        tenantId: record.tenant_id,
        provider: "telegram",
      };
    }

    return { ok: false, code: "unsupported_provider" };
  };
}
