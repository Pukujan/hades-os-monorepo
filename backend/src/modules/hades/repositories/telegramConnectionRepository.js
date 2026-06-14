function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function last4(token) {
  if (!token || token.length < 4) return token || "";
  return token.slice(-4);
}

export function createTelegramConnectionRepository({ storage = "memory", crypto = null } = {}) {
  const connections = new Map();
  const byTelegramUserId = new Map();

  async function createOrUpdate({ userId, tenantId, telegramUserId, botToken, botUsername, status }) {
    const existing = byTelegramUserId.get(telegramUserId);
    const id = existing?.id || createId("tgconn");
    const encrypted = crypto && typeof crypto.encrypt === "function"
      ? crypto.encrypt(botToken)
      : `encrypted:${botToken}`;

    const record = {
      id,
      user_id: userId,
      tenant_id: tenantId,
      telegram_user_id: telegramUserId,
      encrypted_bot_token: encrypted,
      token_last4: last4(botToken),
      bot_username: botUsername || null,
      status: status || "connected",
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    connections.set(id, record);
    byTelegramUserId.set(telegramUserId, record);
    return record;
  }

  async function findPublicByUser({ userId, tenantId }) {
    for (const record of connections.values()) {
      if (record.user_id === userId && record.tenant_id === tenantId) {
        const { encrypted_bot_token, bot_token, ...rest } = record;
        return rest;
      }
    }
    return null;
  }

  async function findRuntimeTokenByTelegramUserId({ telegramUserId }) {
    const record = byTelegramUserId.get(telegramUserId) || null;
    if (!record) return null;
    const decrypted = crypto && typeof crypto.decrypt === "function"
      ? crypto.decrypt(record.encrypted_bot_token)
      : record.encrypted_bot_token.replace("encrypted:", "");
    return { botToken: decrypted };
  }

  async function findByTelegramUserId({ telegramUserId }) {
    return byTelegramUserId.get(telegramUserId) || null;
  }

  return { createOrUpdate, findPublicByUser, findRuntimeTokenByTelegramUserId, findByTelegramUserId };
}
